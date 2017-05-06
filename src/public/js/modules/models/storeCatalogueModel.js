define([
  'jquery', 
  'modules/ebayApi/inventory'],
  function(
    nsc, 
    objApiInventory
  ) {
   
  var objStoreCatalogueModel = {};
  
  objStoreCatalogueModel.objData = {
    objDepartments    : {},
    objCataegories    : {},
    objBrands         : {},
    objThemes         : {},
    objStoreStructure : {},
    arrItems          : {}
  };
  
  objStoreCatalogueModel.objFilters = {
    nDeptID           : 'all',
    nCatID            : 'all',
    sBrandName        : null,
    sTheme            : null,
    nOffset           : 0,
    nLimit            : 20,
    nItemCount        : 0,
    sOrderByField     : 'product_name',
    sOrderByDirection : 'ASC'
  };

  objStoreCatalogueModel.N_ITEM_DATA_TTL = (60 * 60 * 24 * 7); // Data has a TTL of 1 week
  objStoreCatalogueModel.sCatalogueKey = 'storeCatalogue';
  
  objStoreCatalogueModel.initialize = function() {
    /* Ask the store for details such as a list of departments, categories, 
     * brands, themes that can be used to filter store products */
    var jqxhr = nsc.ajax({
      url      : app.objModel.objURLs.sStoreURL+'/store/cataloguedata',
      data     : {},
      dataType : "json",
      type     : "get"
    });

    jqxhr.done(function(responsedata) {
      objStoreCatalogueModel.objData = responsedata;
    });
    
    jqxhr.fail(function(xhr, status, errorThrown) {
      console.log('FAIL');
      console.log(xhr.responseText);
      console.log(status);
      console.log(errorThrown);
    });
    
    jqxhr.always(function() {
      nsc(document).trigger('storestructureupdated');
    });
    
    /* Ask the store for a list of items */
    objStoreCatalogueModel.getItemsFromAPI();
  };
  
  objStoreCatalogueModel.setListeners = function() {};

  objStoreCatalogueModel.getStoreStructure = function() {
    return objStoreCatalogueModel.objData.objStoreStructure; 
  };
  
  objStoreCatalogueModel.getBrands = function() {
    return objStoreCatalogueModel.objData.objBrands; 
  };
    
  objStoreCatalogueModel.getThemes = function() {
    return objStoreCatalogueModel.objData.objThemes; 
  };
  
  objStoreCatalogueModel.getItemsFromAPI = function() {
        
    var jqxhr = nsc.ajax({
      url      : app.objModel.objURLs.sCatalogueURL+'/items',
      data     : objStoreCatalogueModel.objFilters,
      dataType : "json",
      type     : "get"
    });

    jqxhr.done(function(responsedata) {
      objStoreCatalogueModel.objData.arrItems      = responsedata.arrItemData;
      objStoreCatalogueModel.objFilters.nItemCount = responsedata.nItemCount;
    });
    
    jqxhr.fail(function(xhr, status, errorThrown) {
      console.log('FAIL');
      console.log(xhr.responseText);
      console.log(status);
      console.log(errorThrown);
    });
    
    jqxhr.always(function() {
      nsc(document).trigger('objItemsUpdated');
    });
  };
  
  objStoreCatalogueModel.getItemByID = function(nProductID) {
    var response = false;
    for (var i = 0, nLength = objStoreCatalogueModel.objData.arrItems.length; i < nLength; i++) {
      if (objStoreCatalogueModel.objData.arrItems[i].product_id == nProductID) {
        return objStoreCatalogueModel.objData.arrItems[i]; 
      }
    }
    return response;
  };
    
  //////////////////////////////////////////////////////////////////////////////
  // The following is if we decide to use localstorage for the store catalogue//
  //////////////////////////////////////////////////////////////////////////////
  
  /**
   * Function charged with a adding a group of items to the model catalogue
   * 
   * @param {type} objItems
   * @returns {undefined}
   */
  objStoreCatalogueModel.loadItems = function(objItems) {
    for (var objKey in objItems) {
      this.updateItem(objItems[objKey]);
    }
  };
  
  /**
   * Function charged with updating an item in the model with a more up to date
   * or a more complete version of an existing product.
   * 
   * @param {type} objItem
   * @returns {undefined}
   */
  objStoreCatalogueModel.updateItem = function(objItem) {
    var sStoreKey = this.sCatalogueKey + '-' + objItem['product_id'];
    
    /* Retrieve any stored data we have on this item */
    var sItem = localStorage.getItem(sStoreKey);
    if (sItem) {
      /* localStorage only stores strings */
      var objStoredItem = JSON.parse(sItem);
      
      /* update the item with the new data */
      for (var sKey in objItem) {
        objStoredItem[sKey] = objItem[sKey];
      }
      
      objItem = objStoredItem;
    }
    
    /* Add a timestamp to the item indicating when it was updated */
    objItem.ttl = Date.now() + objStoreCatalogueModel.N_ITEM_DATA_TTL;
    
    /* Turn our item into a string before sticking it in local storage */
    localStorage.setItem(sStoreKey, JSON.stringify(objItem));
  };
  
  /**
   * Function charged with returning an item from the store catalogue model.
   * 
   * @param {int} nItemID
   * @returns {Boolean|objItem}
   */
  objStoreCatalogueModel.getItemById = function(nItemID) {
    var objItem = null;
    var sItemKey = this.sCatalogueKey + '-' + nItemID;
    var sItem = localStorage.getItem(sItemKey);
    if (sItem) {
      objItem = JSON.parse(sItem);
    }
    return objItem;
  };
  
  objStoreCatalogueModel.getItemByCode = function(sProductCode) {
    var arrStoreCatalogue = app.objModel.objStoreCatalogueModel.objData.arrItems;
    for (var i = 0, nLength = arrStoreCatalogue.length; i < nLength; i++) {
      if (arrStoreCatalogue[i].product_code === sProductCode) {
        return arrStoreCatalogue[i];
      }
    }
    return false;
  };

  return objStoreCatalogueModel;
});