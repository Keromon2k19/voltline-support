/**
 * This script is used to reset the seed data in the Salesforce org.
 * It deletes all Orders and Accounts associated with Contacts that have an email ending with '@example.com'.
 * It also updates the status of those Orders to 'Draft' before deletion.
 */

List<Contact> seedContacts = [SELECT Id, AccountId FROM Contact WHERE Email LIKE '%@example.com'];
Set<Id> accountIds = new Set<Id>();
for (Contact c : seedContacts) {
    accountIds.add(c.AccountId);
}

List<Order> seedOrders = [SELECT Id, AccountId FROM Order WHERE AccountId IN :accountIds];

for (Order o : seedOrders) {
    o.Status = 'Draft';
}
Update seedOrders;

delete seedOrders;
System.debug('Orders deleted: ' + seedOrders.size());

List<Account> seedAccounts = [SELECT Id FROM Account WHERE Id IN :accountIds];

delete seedAccounts;
System.debug('Accounts deleted: ' + seedAccounts.size());

System.debug('Contacts @example.com left: ' + [SELECT COUNT() FROM Contact WHERE Email LIKE '%@example.com']);

System.debug('SEED Orders left: ' + [SELECT COUNT() FROM Order WHERE Storefront_Order_Id__c LIKE 'SEED-%']);
