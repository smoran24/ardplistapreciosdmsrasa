sap.ui.define([
	"sap/ui/core/Fragment",
	"ardplistapreciosdmsrasa/util/Utils",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/m/MessageBox"
], function (Fragment, Utils, Filter, FilterOperator, MessageBox) {
	"use strict";
	let that;
	return {
		open: function (parentController, dataSolicitud) {
			that = this;
			this._parentController = parentController;                      
			this.ownerView = parentController.getView();

			if (!this._solicitudDialog || !this._solicitudDialog.oPopup) {
				this._solicitudDialog = Fragment.load({
					name: "ardplistapreciosdmsrasa.view.dialogs.SolicitudRevisionPrecio",
					controller: this
				}).then(function (oValueHelpDialog) {
					that.ownerView.addDependent(oValueHelpDialog);
					that._solicitudDialog = oValueHelpDialog;
					that._solicitudDialog.open();
				});
			} else {
				this._solicitudDialog.open();
			}

			this.ownerView.getModel().setProperty("/Solicitud", {
				Material: dataSolicitud.MATERIAL,
				Descripcion: dataSolicitud.DESCRIPCION,
				PrecioDealer: dataSolicitud.PRECIO_DEALER,
				MonedaDealer: dataSolicitud.MONEDA_DEALER,
				PrecioSugerido: dataSolicitud.PRECIO_SUGERIDO,
				MonedaSugerido: dataSolicitud.MONEDA_SUGERIDO,
				Marca: "",
				PrecioMarca: "",
				Fuente: "",
				Comentario: "",
				Adjuntos: []
			});
			
			this._localModel = this.ownerView.getModel();
			this._hanaModel = this.ownerView.getModel("HanaModel");
			this._ABAPModel = this.ownerView.getModel("ABAPModel");
			this._languageModel = this.ownerView.getModel("i18n");
		},

		onAdjuntoAgregado: function (oEvent) {
			let adjuntos = this.ownerView.getModel().getProperty("/Solicitud/Adjuntos");
			let itemAgregado = oEvent.getParameter("item").getFileObject();
			itemAgregado.index = adjuntos.length;
			adjuntos.push(itemAgregado);

			if (adjuntos.length >= 3) {
				oEvent.getSource().setUploadEnabled(false);
			}

			this.ownerView.getModel().setProperty("/Solicitud/Adjuntos", adjuntos);
			
			this._uploadSet = oEvent.getSource();
		},
		onAdjuntoRemovido: function (oEvent) {
			let adjuntos = this.ownerView.getModel().getProperty("/Solicitud/Adjuntos");
			let itemRemovido = oEvent.getParameter("item").getFileObject();
			adjuntos = adjuntos.filter(adjunto => adjunto.index !== itemRemovido.index);

			oEvent.getSource().setUploadEnabled(true);

			this.ownerView.getModel().setProperty("/Solicitud/Adjuntos", adjuntos);
		},

		base64coonversionMethod: function (fileDetails) {
			var that = this;
			var dfdConversion = $.Deferred();
			
			if (!FileReader.prototype.readAsBinaryString) {
				FileReader.prototype.readAsBinaryString = function (fileData) {
					var binary = "";
					var reader = new FileReader();
					reader.onload = function (e) {
						var bytes = new Uint8Array(reader.result);
						var length = bytes.byteLength;
						for (var i = 0; i < length; i++) {
							binary += String.fromCharCode(bytes[i]);
						}
						//that.base64ConversionRes = btoa(binary);
						var base64ConversionRes = btoa(binary);
						dfdConversion.resolve(base64ConversionRes);
					};
					reader.readAsArrayBuffer(fileData);
				};
			}
			var reader = new FileReader();
			reader.onload = function (readerEvt) {
				var binaryString = readerEvt.target.result;
				//that.base64ConversionRes = btoa(binaryString);
				var base64ConversionRes = btoa(binaryString);
				dfdConversion.resolve(base64ConversionRes);
			};
			reader.readAsBinaryString(fileDetails);
			return dfdConversion;
		},

		sendSolicitud: function () {
			var that = this;
			let datosSolicitud = this.ownerView.getModel().getProperty("/Solicitud");

			if(!this.datosValidos(datosSolicitud)){
				return;
			}

			this.setBusyDialog(true);
			
			let destinatarios = that._localModel.getProperty("/DestinatariosMailRevisionPrecio");
			
			var mimeType = [];
			var nombreAdj = [];
			var adjuntos = [];
			for (var i = 0; i < 3; i++){
				mimeType[i] = "";
				nombreAdj[i] = "";
				adjuntos[i] = "";
			}
			
			let adjuntosAsFile = that._localModel.getProperty("/Solicitud/Adjuntos");
			var dfdsConversionAdjuntos = [];
			for (let i = 0; i < adjuntosAsFile.length; i++){
				var adjuntoAsFile = adjuntosAsFile[i];
				
				mimeType[i] = adjuntoAsFile.type;
				nombreAdj[i] = adjuntoAsFile.name;
				
				var dfdConversion = that.base64coonversionMethod(adjuntoAsFile);
				$.when(dfdConversion).then(function(base64Conversion){
					adjuntos[i] = base64Conversion;
				});
				
				dfdsConversionAdjuntos.push(dfdConversion);
			}
			
			let contacto = Utils.currentUserIASData.name.givenName;
			contacto += " " + Utils.currentUserIASData.name.familyName;
			contacto += Utils.currentUserIASData.emails[0] ? "(" + Utils.currentUserIASData.emails[0].value + ")" : "";
			
			$.when(...dfdsConversionAdjuntos).then(function(){
				var parametros = {
					Destinatarios: destinatarios,
					Contacto: contacto,
					Material: datosSolicitud.Material,
					Descripcion: datosSolicitud.Descripcion,
					PNC: datosSolicitud.PrecioDealer,
					MonedaPNC: datosSolicitud.MonedaDealer,
					PrecioFinalSiva: datosSolicitud.PrecioSugerido,
					MonedaPrecioFinalSiva: datosSolicitud.MonedaSugerido,
					Marca: datosSolicitud.Marca,
					PrecioFinalCiva: datosSolicitud.PrecioMarca,
					MonedaPrecioFinalCiva: datosSolicitud.MonedaMarca,
					Fuente: datosSolicitud.Fuente,
					Comentario: datosSolicitud.Comentario,
					Adjuntos1: adjuntos[0],
					MimeType1: mimeType[0],
					NombreAdj1: nombreAdj[0],
					Adjuntos2: adjuntos[1],
					MimeType2: mimeType[1],
					NombreAdj2: nombreAdj[1],
					Adjuntos3: adjuntos[2],
					MimeType3: mimeType[2],
					NombreAdj3: nombreAdj[2],
				};

				$.ajax({
					type: 'POST',
					url: '/destinations/AR_DP_DEST_CPI/http/AR/DealerPortal/EnviarSolicitud',
					contentType: 'application/json; charset=utf-8',
					data: JSON.stringify(parametros),
					success: function (dataR, textStatus, jqXHR) {
						MessageBox.success(that._languageModel.getProperty("ExitoEnvioMail"));
						
						that.closeSolicitudDialog();
						that.setBusyDialog(false);
					},
					error: function (jqXHR, textStatus, errorThrown) {
						MessageBox.error(that._languageModel.getProperty("ErrorEnvioMail"));

						that.setBusyDialog(false);
					}
				});
			});
		},
		datosValidos: function(datosSolicitud){
			if(!datosSolicitud.PrecioMarca){
				MessageBox.warning("Debe ingresar el precio.");
				return false;
			}else if(datosSolicitud.PrecioMarca == 0){
				MessageBox.warning("El precio debe ser mayor a 0.");
				return false;
			}
			
			if(!datosSolicitud.MonedaMarca){
				MessageBox.warning("Debe ingresar la moneda correspondiente al precio.");
				return false;
			}
			
			if(!datosSolicitud.Fuente){
				MessageBox.warning("Debe ingresar la fuente del precio.");
				return false;
			}
			
			return true;
		},

		closeSolicitudDialog: function () {
			this._solicitudDialog.close();
			
			if(this._uploadSet)
				this._uploadSet.removeAllItems();
		},
		
		setBusyDialog: function(value){
			this._activeBusyDialogs = this._activeBusyDialogs ? this._activeBusyDialogs : 0;
			this._activeBusyDialogs += value ? 1 : -1;
			that._solicitudDialog.setBusy(this._activeBusyDialogs != 0);
		}
	}
});