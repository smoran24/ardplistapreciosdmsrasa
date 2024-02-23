sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox",
	"ardplistapreciosdmsrasa/util/Utils",
	"ardplistapreciosdmsrasa/js/DialogSolicitudRevisionPrecio",
	"sap/ui/export/library",
	"sap/ui/export/Spreadsheet",
	'sap/m/Token',
	"../util/ValueHelp"
], function (Controller, JSONModel, Filter, FilterOperator, MessageBox, Utils, SolicitudDialog, LibraryEdmType,
	Spreadsheet, Token, ValueHelp) {
	"use strict";
	var aContexts;
	let that;
	return Controller.extend("ardplistapreciosdmsrasa.controller.Main", {

		onInit: function () {
			that = this;
			this.setBusyDialog(true);

			this.setUpModels();

			let dfdUserRoleCheck = $.Deferred();
			let dfdCurrentUserIASData = Utils.loadCurrentUserIASData();
			let dfdIsNissanUser = Utils.isCurrentUserANissanUser();

			$.when(dfdCurrentUserIASData, dfdIsNissanUser).then(function (currentUserDataIAS, isNissanUser) {
				that._localModel.setProperty("/UserNissan", isNissanUser);
				that._localModel.setProperty("/UserEmail", currentUserDataIAS.emails[0].value);
				if (!isNissanUser) {
					that.setUserAsSolicitante(currentUserDataIAS);
				}else{
					that._localModel.setProperty("/Filtros/Solicitante", Utils.getConcesionarioNissan());
				}
				dfdUserRoleCheck.resolve();
			});

			$.when(dfdUserRoleCheck).then(function () {
				that.setBusyDialog(false);
			});
		},
		
		onExit: function () {
			if (this._oDialog) {
				this._oDialog.destroy();
			}
		},

		setUserAsSolicitante: function (currentUserIASData) {
			if (currentUserIASData["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"]) {
				let atributosUsuario = currentUserIASData["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"].attributes;
				let codigoSucursal = atributosUsuario.find(attribute => attribute.name == "customAttribute6").value

				if (codigoSucursal) {
					this._localModel.setProperty("/Filtros/Solicitante", "0000" + codigoSucursal);
				}
			}
		},

		setUpModels: function () {
			this._localModel = this.getOwnerComponent().getModel();
			this._localModel.setProperty("/Filtros", {
				Material: {
					ValoresPosibles: "",
					Texto: ""
				},
				Validez: new Date(),
				Solicitante: ""
			});

			this._hanaModel = this.getOwnerComponent().getModel("HanaModel");
			this._ABAPModel = this.getOwnerComponent().getModel("ABAPModel");
			this._languageModel = this.getOwnerComponent().getModel("i18n");
		},

		loadMateriales: function () {
			this.setBusyDialog(true);

			let dfdMateriales = $.Deferred();
			this._hanaModel.read("/material", {
				urlParameters: {"$top":600},
				success: function (datos) {
					that._localModel.setProperty("/Filtros/Material/ValoresPosibles", datos.results);

					dfdMateriales.resolve();
					that.setBusyDialog(false);
				},
				error: function () {
					MessageBox.error("Error al cargar los materiales, contacte a soporte.", {
						title: "Error de comunicación"
					});
					that.setBusyDialog(false);
				}
			});

			return dfdMateriales;
		},

		getFiltros: function () {
			let filtrosService = [];
			var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyyMMdd"
			});
			let filtros = this._localModel.getProperty("/Filtros");
			let vigencia = dateFormat.format(filtros.Validez);
			let materiales = this.byId("material").getTokens();
			let concesionario = filtros.Solicitante;

			if (vigencia) {
				let filterByVigencia = new Filter("VIGENCIA", FilterOperator.EQ, vigencia);
				filtrosService.push(filterByVigencia);
			}

			if (materiales) {
				for (var l in materiales) {
					// let filterByMaterial = new Filter("MATERIAL", FilterOperator.EQ, materiales[l].getText());
					let filterByMaterial = new Filter("MATERIAL", FilterOperator.EQ, materiales[l].mProperties.key);
					filtrosService.push(filterByMaterial);
				}
			}

			if (concesionario) {
				let filterByConcesionario = new Filter("DEALER", FilterOperator.EQ, concesionario);
				filtrosService.push(filterByConcesionario);
			}

			return filtrosService;
		},

		handleMaterialesValueHelp: function (oEvent) {
			var oProps = {
				oControl: oEvent.getSource(),
				oModel: this._hanaModel,
				sEntity: "/material",
				basicSearch: false,
				aCols: [
					{
						// label: this.getText('MATERIAL'),
						label: 'MATERIAL',
						template: "MATERIAL",
						width: "10rem",
						filtrable: true,
						key: true,
						descriptionKey: "DESCRIPCION"
					},
					{
						// label: this.getText('DESCRIPCION'),
						label: 'DESCRIPCION',
						template: "DESCRIPCION",
						filtrable: "true",
					}
				]
			}
			var oVH = new ValueHelp( oProps );
			oVH.open()
		},

		handleValueHelpClose: function (oEvent) {
			this.byId("material").removeAllTokens();
			var oSelectedItems = [],
				oInput = this.byId("valueHelpMateriales");
			aContexts = oEvent.getParameter("selectedContexts");
			for (var i = 0; i < aContexts.length; i++) {
				oSelectedItems.push(this.getView().getModel().getProperty(aContexts[i].sPath));
			}
			// var oSelectedItems = oEvent.getParameter("selectedItems"),
			// oInput = this.byId("valueHelpMateriales");
			var aTitle = [];
			for (var title = 0; title < oSelectedItems.length; title++) {
				var text = oSelectedItems[title].MATERIAL;
				aTitle.push(text);
			}
			//adding the selected values to the tokens.
			for (var plant = 0; plant < aTitle.length; plant++) {
				this.byId("material").addToken(new Token({
					text: aTitle[plant]
				}));
			}

			if (!oSelectedItems) {
				oInput.resetProperty("value");
			}
		},
		
		filtroMaterialesValueHelp: function(oEvent){
			debugger;
			let filterValue = oEvent.getParameter("value").toUpperCase();
			
			let filters = [];
			filters.push(new Filter('MATERIAL', FilterOperator.StartsWith, filterValue));
			
			oEvent.getParameter("itemsBinding").filter(filters);
		},

		handleDialogSolicitudRevisionPrecio: function (oEvent) {
			let pathEntrada = oEvent.getSource().getParent().getBindingContextPath();
			let datosEntrada = this._localModel.getProperty(pathEntrada);
			
			SolicitudDialog.open(this, datosEntrada);
		},

		descargarContenidoTabla: function () {
			let rows = this._localModel.getProperty("/ContenidoTabla");
			if(rows && rows.length > 0){
				let oSettings, oSheet;
				let columnsFormat = this.createColumnConfig();
				let fechaVigencia = this._localModel.getProperty("/Filtros/Validez").toLocaleDateString();
				fechaVigencia = fechaVigencia.replaceAll("/", "-");
				let nombreArchivo = this._languageModel.getProperty('ListaPrecios') + " " + fechaVigencia + '.xls';
				for(let i = 0; i < rows.length; i++) {
					rows[i].PRECIO_DEALER_NFT = rows[i].PRECIO_DEALER_NFT.replace(".",",");
					rows[i].PRECIO_SUGERIDO_NFT = rows[i].PRECIO_SUGERIDO_NFT.replace(".",",");
				}
				
				oSettings = {
					workbook: {
						columns: columnsFormat,
						hierarchyLevel: 'Level'
					},
					dataSource: rows,
					fileName: nombreArchivo,
					worker: false // We need to disable worker because we are using a MockServer as OData Service
				};
	
				oSheet = new Spreadsheet(oSettings);
				oSheet.build().finally(function () {
					oSheet.destroy();
				});
			}else{
				MessageBox.warning("No hay contenido para descargar en la tabla.");
			}
		},
		createColumnConfig: function () {
			var aCols = [];

			aCols.push({
				label: this._languageModel.getProperty('Material'),
				type: LibraryEdmType.EdmType.String,
				property: 'MATERIAL',
				scale: 0
			});
			
			aCols.push({
				label: this._languageModel.getProperty('Descripcion'),
				property: 'DESCRIPCION',
				type: LibraryEdmType.EdmType.String
			});

			aCols.push({
				label: this._languageModel.getProperty('PrecioDealer'),
				property: 'PRECIO_DEALER_NFT',
				type: LibraryEdmType.EdmType.Decimal,
				unit: 'ARS'
			});
			
			aCols.push({
				label: this._languageModel.getProperty('PrecioCliente'),
				property: 'PRECIO_SUGERIDO_NFT',
				type: LibraryEdmType.EdmType.Decimal,
				unit: 'ARS'
			});

			aCols.push({
				label: this._languageModel.getProperty('Margen'),
				property: 'MARGEN',
				type: LibraryEdmType.EdmType.Number,
				unit: '%'
			});

			return aCols;
		},

		mayuscula: function (oEvent) {
			var txt = oEvent.getSource();
			txt.setValue(txt.getValue().toUpperCase());
		},

		setBusyDialog: function (value) {
			this._activeBusyDialogs = this._activeBusyDialogs ? this._activeBusyDialogs : 0;
			this._activeBusyDialogs += value ? 1 : -1;
			this.getView().setBusy(this._activeBusyDialogs != 0);
		},

		cargarContenidoTabla: function () {
			var that = this;
			this.setBusyDialog(true);
			let dfdContenidoTabla = $.Deferred();
			
			if(!this.datosValidos()){
				that.setBusyDialog(false);
				return;
			}
			
			that._ABAPModel.read("/PrecioSet", {
				filters: that.getFiltros(),
				success: function (data) {
					let resultadosFormateados = that.formatearResultados(data.results);
					that._localModel.setProperty("/ContenidoTabla", resultadosFormateados);
					that.habilitacionRevisionPrecio();
					
					that.setBusyDialog(false);
					dfdContenidoTabla.resolve();
				},
				error: function () {
					MessageBox.error("Error al cargar el contenido de la tabla, contacte a soporte.");
					that.setBusyDialog(false);
				}
			});

			return dfdContenidoTabla;
		},
		datosValidos: function(){
			let filtrosDatos = this._localModel.getProperty("/Filtros");
			
			if(!filtrosDatos.Validez){
				MessageBox.warning("Debe ingresar la fecha de Vigencia para consultar.");
				return false;
			}
			
			if(!filtrosDatos.Solicitante){
				MessageBox.error("No se obtuvo el solicitante correctamente, contacte a soporte.");
				return false;
			}
			
			let multiSelectMateriales = this.byId("material");
			let materialesSeleccionados = multiSelectMateriales.getTokens();
			if(materialesSeleccionados.length == 0 || materialesSeleccionados.length > 20){
				MessageBox.warning("Se debe seleccionar una cantidad de materiales entre 1 y 20.");
				return false;
			}
			
			return true;
		},
		habilitacionRevisionPrecio: function(){
			let filtrosDatos = this._localModel.getProperty("/Filtros");
			let hoy = new Date();

			if(filtrosDatos.Validez.getDate() == hoy.getDate() && filtrosDatos.Validez.getMonth() == hoy.getMonth() 
			&& filtrosDatos.Validez.getFullYear() == hoy.getFullYear()){
				this._localModel.setProperty("/RevisionPrecioHabilitada", true)
			}else{
				this._localModel.setProperty("/RevisionPrecioHabilitada", false)
			}
		},
		
		formatearResultados: function (resultados) {
			resultados.forEach(function (material) {
				material.MATERIAL = material.MATERIAL ? material.MATERIAL.trim() : 0;
				material.DESCRIPCION = material.DESCRIPCION ? material.DESCRIPCION.trim() : 0;
				material.PRECIO_DEALER = material.PRECIO_DEALER ? material.PRECIO_DEALER.trim() : 0;
				material.PRECIO_SUGERIDO = material.PRECIO_SUGERIDO ? material.PRECIO_SUGERIDO.trim() : 0;
				material.MARGEN = material.MARGEN ? material.MARGEN.trim() : 0;
			});

			return resultados;
		},
		
		handleDescargarListaCompleta: function(){
			// var appid = this.getOwnerComponent().getManifestEntry("/sap.app/id").replaceAll(".","/");
            // var appModulePath = jQuery.sap.getModulePath(appid);
			const appModulePath = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");
			let filtrosDatos = this._localModel.getProperty("/Filtros");
			if(!filtrosDatos.Solicitante){
				MessageBox.error("No se obtuvo el solicitante correctamente, contacte a soporte.");
				return;
			}
			let dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
				pattern: "yyyyMMdd"
			});
			
			let parameters = {
				Mail: this._localModel.getProperty("/UserEmail"),
				Dealer: filtrosDatos.Solicitante,
				Vigencia: dateFormat.format(new Date())
			}
			
			$.ajax({
				type: 'POST',
				url: appModulePath + '/destinations/AR_DP_DEST_CPI/http/AR/DealerPortal/EnviarListaPrecios',
				contentType: 'application/json; charset=utf-8',
				dataType: 'json',
				data: JSON.stringify(parameters)
			});
			
			MessageBox.information("En unos minutos, recibirá la lista de precios en el mail asociado a su cuenta.");
		}
	});
});