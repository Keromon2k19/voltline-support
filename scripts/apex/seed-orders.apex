/*
 * KAN-52 · Seeds customers and backdated orders.
 *
 * 1. Creates each customer as an Account with one Contact (@example.com email).
 * 2. Creates the orders as Draft, with their shipping fields and an EffectiveDate
 *    counted back from today, so "under or over 30 days" stays true on any day.
 * 3. Adds the order items, priced from the Standard Price Book.
 * 4. Activates the orders. Items can't be added once an order is Activated.
 *
 * Don't run this file on its own. scripts/seed-orders.mjs swaps the placeholders
 * below for the contents of data/customers.json and data/orders.json and runs the
 * result with `sf apex run`.
 *
 * Needs the products and Standard Price Book entries from KAN-51. Run the reset
 * (KAN-53) first: if the seed orders already exist, this stops before saving anything.
 * Everything runs in one transaction, so an error rolls it all back.
 *
 * Anonymous Apex runs as the current user and checks their field access when it
 * compiles, so that user needs edit access to the Order custom fields
 * (the Voltline_Administrator permission set group).
 */

class SeedException extends Exception {}

class OrderSpec {
    String shippingStatus;
    Integer daysSinceOrder;
    Integer daysSinceDelivery;
    List<String> skus = new List<String>();
    List<Integer> quantities = new List<Integer>();
}

String readText(Map<String, Object> item, String key, String context) {
    Object value = item.get(key);
    if (!(value instanceof String) || String.isBlank((String) value)) {
        throw new SeedException(context + ': "' + key + '" is missing or blank.');
    }
    return ((String) value).trim();
}

Decimal readNumber(Map<String, Object> item, String key, String context) {
    Object value = item.get(key);
    if (value == null) {
        throw new SeedException(context + ': "' + key + '" is missing.');
    }
    try {
        // JSON.deserializeUntyped returns Integer for 399 and Decimal for 129.99,
        // so go through String to get a Decimal either way.
        return Decimal.valueOf(String.valueOf(value));
    } catch (TypeException e) {
        throw new SeedException(context + ': "' + key + '" is not a number.');
    }
}

Integer readWholeNumber(Map<String, Object> item, String key, String context) {
    Decimal value = readNumber(item, key, context);
    Integer whole = value.intValue();
    if (whole != value || whole < 0) {
        throw new SeedException(context + ': "' + key + '" must be a whole number of 0 or more.');
    }
    return whole;
}

String customersJson = '__CUSTOMERS_JSON__';
String ordersJson = '__ORDERS_JSON__';

// Shipping statuses must already exist as values of the Shipping_Status__c picklist (data model, HU-02).
Set<String> shippingStatuses = new Set<String>();
for (Schema.PicklistEntry entry : Order.Shipping_Status__c.getDescribe().getPicklistValues()) {
    if (entry.isActive()) {
        shippingStatuses.add(entry.getValue());
    }
}

// 1. Read and validate the customers.
List<Object> customerRows = (List<Object>) JSON.deserializeUntyped(customersJson);
List<String> firstNames = new List<String>();
List<String> lastNames = new List<String>();
List<String> emails = new List<String>();
Set<String> seenEmails = new Set<String>();
Integer position = 0;

for (Object raw : customerRows) {
    position++;
    Map<String, Object> row = (Map<String, Object>) raw;
    String email = readText(row, 'email', 'Customer #' + position).toLowerCase();

    if (!email.endsWith('@example.com')) {
        throw new SeedException(
            email + ': the email must end in @example.com. The reset (KAN-53) finds the seed data by that domain.'
        );
    }
    if (!seenEmails.add(email)) {
        throw new SeedException(email + ': email appears more than once.');
    }

    firstNames.add(readText(row, 'firstName', email));
    lastNames.add(readText(row, 'lastName', email));
    emails.add(email);
}

if (emails.isEmpty()) {
    throw new SeedException('There are no customers.');
}

// 2. Read and validate the orders.
List<Object> orderRows = (List<Object>) JSON.deserializeUntyped(ordersJson);
List<OrderSpec> specs = new List<OrderSpec>();
Set<String> skus = new Set<String>();
position = 0;

for (Object raw : orderRows) {
    position++;
    Map<String, Object> row = (Map<String, Object>) raw;
    String context = 'Order #' + position;
    OrderSpec spec = new OrderSpec();

    spec.shippingStatus = readText(row, 'shippingStatus', context);
    if (!shippingStatuses.contains(spec.shippingStatus)) {
        throw new SeedException(
            context + ': "' + spec.shippingStatus + '" is not an active Order.Shipping_Status__c value. Deploy the data model first.'
        );
    }

    spec.daysSinceOrder = readWholeNumber(row, 'daysSinceOrder', context);
    if (spec.shippingStatus == 'Delivered') {
        spec.daysSinceDelivery = readWholeNumber(row, 'daysSinceDelivery', context);
        if (spec.daysSinceDelivery >= spec.daysSinceOrder) {
            throw new SeedException(
                context + ': an order can only be delivered after it was placed, so daysSinceDelivery must be less than daysSinceOrder.'
            );
        }
    }

    List<Object> itemRows = (List<Object>) row.get('items');
    if (itemRows == null || itemRows.isEmpty()) {
        throw new SeedException(context + ': "items" is missing or empty.');
    }
    for (Object rawItem : itemRows) {
        Map<String, Object> item = (Map<String, Object>) rawItem;
        String sku = readText(item, 'sku', context);
        Integer quantity = readWholeNumber(item, 'quantity', context + ', ' + sku);
        if (quantity == 0) {
            throw new SeedException(context + ', ' + sku + ': quantity must be greater than 0.');
        }
        spec.skus.add(sku);
        spec.quantities.add(quantity);
        skus.add(sku);
    }

    specs.add(spec);
}

if (specs.isEmpty()) {
    throw new SeedException('There are no orders.');
}

// 3. Check what the org needs before saving anything.
if ([SELECT COUNT() FROM Order WHERE Storefront_Order_Id__c LIKE 'SEED-%'] > 0) {
    throw new SeedException('The seed orders are already in this org. Run the reset first (KAN-53).');
}

Store_Setting__mdt setting = Store_Setting__mdt.getInstance('Default');
if (setting == null || setting.Delivery_Lead_Days__c == null) {
    throw new SeedException('Store_Setting__mdt needs a Default record with Delivery_Lead_Days__c. Deploy the data model first.');
}
Integer leadDays = setting.Delivery_Lead_Days__c.intValue();

List<Pricebook2> standardBooks = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
if (standardBooks.isEmpty()) {
    throw new SeedException('This org has no Standard Price Book.');
}
Id pricebookId = standardBooks[0].Id;

Map<String, PricebookEntry> entriesBySku = new Map<String, PricebookEntry>();
for (PricebookEntry entry : [
    SELECT Id, UnitPrice, Product2.StockKeepingUnit
    FROM PricebookEntry
    WHERE Pricebook2Id = :pricebookId AND IsActive = true AND Product2.StockKeepingUnit IN :skus
]) {
    entriesBySku.put(entry.Product2.StockKeepingUnit, entry);
}
for (String sku : skus) {
    if (!entriesBySku.containsKey(sku)) {
        throw new SeedException(sku + ': no active Standard Price Book entry. Seed the products first (KAN-51).');
    }
}

// 4. Create the customers.
List<Account> accounts = new List<Account>();
for (Integer i = 0; i < emails.size(); i++) {
    accounts.add(new Account(Name = firstNames[i] + ' ' + lastNames[i]));
}
insert accounts;

List<Contact> contacts = new List<Contact>();
for (Integer i = 0; i < emails.size(); i++) {
    contacts.add(new Contact(
        FirstName = firstNames[i],
        LastName = lastNames[i],
        Email = emails[i],
        AccountId = accounts[i].Id
    ));
}
insert contacts;

// 5. Create the orders as Draft, handing them out to the customers in turn. The shipping
//    fields go in now: the Tracking_Number_Required rule wants the tracking number as soon
//    as an order is Shipped or Delivered. The Storefront_Order_Id__c is SEED-001, SEED-002...
Date today = Date.today();
List<Order> orders = new List<Order>();
for (Integer i = 0; i < specs.size(); i++) {
    OrderSpec spec = specs[i];
    Integer customer = Math.mod(i, accounts.size());
    Date orderDate = today.addDays(-spec.daysSinceOrder);

    Order order = new Order(
        AccountId = accounts[customer].Id,
        BillToContactId = contacts[customer].Id,
        EffectiveDate = orderDate,
        Status = 'Draft',
        Pricebook2Id = pricebookId,
        Shipping_Status__c = spec.shippingStatus,
        Estimated_Delivery_Date__c = orderDate.addDays(leadDays),
        Storefront_Order_Id__c = 'SEED-' + String.valueOf(1001 + i).substring(1)
    );
    if (spec.shippingStatus != 'Preparing') {
        order.Tracking_Number__c = 'VLTRK' + String.valueOf(900000 + i * 37);
    }
    if (spec.shippingStatus == 'Delivered') {
        order.Delivery_Date__c = today.addDays(-spec.daysSinceDelivery);
    }
    orders.add(order);
}
insert orders;

// 6. Create the order items, priced from the Standard Price Book.
List<OrderItem> items = new List<OrderItem>();
for (Integer i = 0; i < specs.size(); i++) {
    OrderSpec spec = specs[i];
    for (Integer j = 0; j < spec.skus.size(); j++) {
        PricebookEntry entry = entriesBySku.get(spec.skus[j]);
        items.add(new OrderItem(
            OrderId = orders[i].Id,
            PricebookEntryId = entry.Id,
            Quantity = spec.quantities[j],
            UnitPrice = entry.UnitPrice
        ));
    }
}
insert items;

// 7. Activate the orders. This goes last because items can't be added once an order is Activated.
List<Order> toActivate = new List<Order>();
for (Order order : orders) {
    toActivate.add(new Order(Id = order.Id, Status = 'Activated'));
}
update toActivate;

// 8. Summary, printed by scripts/seed-orders.mjs.
Map<String, Integer> ordersByStatus = new Map<String, Integer>();
for (OrderSpec spec : specs) {
    Integer count = ordersByStatus.containsKey(spec.shippingStatus) ? ordersByStatus.get(spec.shippingStatus) : 0;
    ordersByStatus.put(spec.shippingStatus, count + 1);
}
List<String> statusSummary = new List<String>();
for (String status : ordersByStatus.keySet()) {
    statusSummary.add(ordersByStatus.get(status) + ' ' + status);
}
System.debug(
    LoggingLevel.INFO,
    'Customers: ' + accounts.size() + ' accounts, each with one contact. ' +
    'Orders: ' + orders.size() + ' activated (' + String.join(statusSummary, ', ') + '), ' +
    items.size() + ' order items.'
);
