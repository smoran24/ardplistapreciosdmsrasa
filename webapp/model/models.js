sap.ui.define([
	"sap/ui/model/json/JSONModel",
	"sap/ui/Device",
	"sap/ui/model/odata/v2/ODataModel"
], function (JSONModel, Device, OData) {
	"use strict";

	return {

		createDeviceModel: function () {
			var oModel = new JSONModel(Device);
			oModel.setDefaultBindingMode("OneWay");
			return oModel;
		},
		createHanaModel: function(){
			let appModulePAth = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");

			let oModel = new OData({
				"serviceUrl": appModulePAth + "/destinations/AR_DP_REP_DEST_HANA/ODATA_ListaPrecios.xsodata/"
			});
			oModel.setUseBatch(false);
			
			return oModel;
		},
		createABAPModel: function(){
			let appModulePAth = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");

			let oModel = new OData({
				"serviceUrl": appModulePAth+ "/destinations/AR_DP_DEST_ODATA/odata/SAP/Z_NARG_DP_36_SRV;v=1/"
			});
			oModel.setUseBatch(false);
			
			return oModel;
		}

	};
});