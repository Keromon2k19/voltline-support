public with sharing class StoreSettings {
  private static Store_Setting__mdt cached;

  public static Store_Setting__mdt get() {
    if (cached == null) {
      cached = Store_Setting__mdt.getInstance('Default');
    }
    return cached;
  }
}
