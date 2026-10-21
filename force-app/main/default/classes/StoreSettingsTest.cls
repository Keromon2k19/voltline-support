@IsTest
private class StoreSettingsTest {
  @IsTest
  static void getReturnsTheDefaultRecord() {
    Store_Setting__mdt setting = StoreSettings.get();

    Assert.areEqual('Default', setting.DeveloperName);
  }
}
