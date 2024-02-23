sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"ardplistapreciosdmsrasa/model/models",
	"sap/ui/core/IconPool"
], function (UIComponent, Device, models, IconPool) {
	"use strict";

	return UIComponent.extend("ardplistapreciosdmsrasa.Component", {

		metadata: {
			manifest: "json"
		},

		/**
		 * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
		 * @public
		 * @override
		 */
		init: function () {
			// call the base component's init function
			UIComponent.prototype.init.apply(this, arguments);

			// enable routing
			this.getRouter().initialize();

			// set the device model
			this.setModel(models.createDeviceModel(), "device");
			this.setModel(models.createHanaModel(), "HanaModel");
			this.setModel(models.createABAPModel(), "ABAPModel");
			this.setModel(new sap.ui.model.json.JSONModel());

			if (this.getComponentData()){
				let destinatarios = this.getComponentData().startupParameters.mailsDestinatarios;
				
				this.getModel().setProperty("/DestinatariosMailRevisionPrecio", destinatarios);
			}else{//Para testear en WEBIDE
				this.getModel().setProperty("/DestinatariosMailRevisionPrecio", "jbustos@blueboot.com");//"repuestos.soporte@nissan.com.ar"
			}
			
			this.habilitarIconosExtra();
		},
		habilitarIconosExtra: function(){
			var b = [];
			var c = {};
			
			//Fiori Theme font family and URI
			var t = {
				fontFamily: "SAP-icons-TNT",
				fontURI: sap.ui.require.toUrl("sap/tnt/themes/base/fonts/")
			};
			//Registering to the icon pool
			IconPool.registerFont(t);
			b.push(IconPool.fontLoaded("SAP-icons-TNT"));
			c["SAP-icons-TNT"] = t;
			//SAP Business Suite Theme font family and URI
			var B = {
				fontFamily: "BusinessSuiteInAppSymbols",
				fontURI: sap.ui.require.toUrl("sap/ushell/themes/base/fonts/")
			};
			//Registering to the icon pool
			IconPool.registerFont(B);
			b.push(IconPool.fontLoaded("BusinessSuiteInAppSymbols"));
			c["BusinessSuiteInAppSymbols"] = B;
		}
	});
});