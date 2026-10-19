/*
 * KAN-51 · Seeds the Voltline catalog.
 *
 * 1. Upserts Product2 by StockKeepingUnit.
 * 2. Creates or updates each product's entry in the Standard Price Book,
 *    whose Id is looked up at runtime because it changes per org.
 *
 * Don't run this file on its own. scripts/seed-products.mjs swaps the catalog
 * placeholder below for the contents of data/products.json and runs the result
 * with `sf apex run`.
 *
 * Safe to run again: existing products and entries are updated, missing ones
 * are created. Everything runs in one transaction, so an error rolls it all back.
 *
 * Anonymous Apex runs as the current user and checks their field access when it
 * compiles, so that user needs edit access to Warranty_Months__c and Stock__c
 * (the Voltline_Administrator permission set group).
 */

class SeedException extends Exception {}

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

String catalogJson = '__CATALOG_JSON__';

// Product lines must already exist as values of the Family picklist (data model, HU-02).
Set<String> productLines = new Set<String>();
for (Schema.PicklistEntry entry : Product2.Family.getDescribe().getPicklistValues()) {
    if (entry.isActive()) {
        productLines.add(entry.getValue());
    }
}

// 1. Read and validate the catalog.
List<Object> catalog = (List<Object>) JSON.deserializeUntyped(catalogJson);
Map<String, Product2> productsBySku = new Map<String, Product2>();
Map<String, Decimal> pricesBySku = new Map<String, Decimal>();
Integer position = 0;

for (Object raw : catalog) {
    position++;
    Map<String, Object> item = (Map<String, Object>) raw;
    String sku = readText(item, 'sku', 'Product #' + position);

    if (!Pattern.matches('VL-[A-Z]{3}-\\d{3}', sku)) {
        throw new SeedException(sku + ': SKU must look like VL-AUD-001.');
    }
    if (productsBySku.containsKey(sku)) {
        throw new SeedException(sku + ': SKU appears more than once in the catalog.');
    }

    String productLine = readText(item, 'productLine', sku);
    if (!productLines.contains(productLine)) {
        throw new SeedException(
            sku + ': "' + productLine + '" is not an active Product2.Family value. Deploy the data model first.'
        );
    }

    Decimal price = readNumber(item, 'price', sku);
    if (price <= 0) {
        throw new SeedException(sku + ': price must be greater than 0.');
    }

    productsBySku.put(
        sku,
        new Product2(
            StockKeepingUnit = sku,
            Name = readText(item, 'name', sku),
            Description = readText(item, 'description', sku),
            Family = productLine,
            DisplayUrl = readText(item, 'imageUrl', sku),
            Warranty_Months__c = readWholeNumber(item, 'warrantyMonths', sku),
            Stock__c = readWholeNumber(item, 'stock', sku),
            IsActive = true
        )
    );
    pricesBySku.put(sku, price);
}

if (productsBySku.isEmpty()) {
    throw new SeedException('The catalog is empty.');
}

// 2. Upsert Product2 by StockKeepingUnit.
Set<String> skus = productsBySku.keySet();
for (Product2 existing : [SELECT Id, StockKeepingUnit FROM Product2 WHERE StockKeepingUnit IN :skus]) {
    Product2 product = productsBySku.get(existing.StockKeepingUnit.toUpperCase());
    if (product.Id != null) {
        throw new SeedException(
            existing.StockKeepingUnit + ': more than one Product2 in the org has this SKU. Remove the duplicate first.'
        );
    }
    product.Id = existing.Id;
}

List<Product2> products = productsBySku.values();
Integer productsUpdated = 0;
for (Product2 product : products) {
    if (product.Id != null) {
        productsUpdated++;
    }
}
upsert products;

// 3. Find the Standard Price Book. Orders need it active.
List<Pricebook2> standardBooks = [SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
if (standardBooks.isEmpty()) {
    throw new SeedException('This org has no Standard Price Book.');
}
Pricebook2 standardBook = standardBooks[0];
if (!standardBook.IsActive) {
    standardBook.IsActive = true;
    update standardBook;
    System.debug(LoggingLevel.INFO, 'Activated the Standard Price Book.');
}

// 4. Create or update the Standard Price Book entries.
Set<Id> productIds = new Map<Id, Product2>(products).keySet();
Map<Id, PricebookEntry> entriesByProductId = new Map<Id, PricebookEntry>();
for (PricebookEntry existing : [
    SELECT Id, Product2Id
    FROM PricebookEntry
    WHERE Pricebook2Id = :standardBook.Id AND Product2Id IN :productIds
]) {
    entriesByProductId.put(existing.Product2Id, existing);
}

List<PricebookEntry> entries = new List<PricebookEntry>();
for (Product2 product : products) {
    PricebookEntry entry = new PricebookEntry(
        UnitPrice = pricesBySku.get(product.StockKeepingUnit),
        IsActive = true
    );
    PricebookEntry existing = entriesByProductId.get(product.Id);
    if (existing != null) {
        entry.Id = existing.Id;
    } else {
        // Product2Id and Pricebook2Id can only be set when the entry is created.
        entry.Pricebook2Id = standardBook.Id;
        entry.Product2Id = product.Id;
        entry.UseStandardPrice = false;
    }
    entries.add(entry);
}
upsert entries;

// 5. Summary, printed by scripts/seed-products.mjs.
for (Product2 product : products) {
    System.debug(
        LoggingLevel.INFO,
        product.StockKeepingUnit + '  ' + product.Name +
        '  price ' + pricesBySku.get(product.StockKeepingUnit).setScale(2) +
        '  stock ' + product.Stock__c
    );
}
System.debug(
    LoggingLevel.INFO,
    'Products: ' + (products.size() - productsUpdated) + ' created, ' + productsUpdated + ' updated. ' +
    'Standard Price Book entries: ' + (entries.size() - entriesByProductId.size()) + ' created, ' +
    entriesByProductId.size() + ' updated.'
);
