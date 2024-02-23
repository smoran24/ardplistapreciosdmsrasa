sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function (JSONModel) {
	"use strict";
	return {
		loadCurrentUserIASData: function () {
			let that = this;
			let dfdIASUserData = $.Deferred();
			let appModulePAth = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");

			if (this.currentUserIASData) {
				dfdIASUserData.resolve(this.currentUserIASData);
			} else {
				let currentUser = this.loadCurrentUserData();

				currentUser.then(function (currentUserData) {
					$.ajax({
						type: 'GET',
						url: appModulePAth + '/destinations/IDP_Nissan/service/scim/Users/' + currentUserData.name,
						contentType: 'application/json; charset=utf-8',
						dataType: 'json',
						async: false,
						success: function (data, textStatus, jqXHR) {
							that.currentUserIASData = data;
							dfdIASUserData.resolve(data);
						},
						error: function (jqXHR, textStatus, errorThrown) {
							dfdIASUserData.resolve();
						}
					});
				});
			}

			return dfdIASUserData;
		},
		
		loadUserIASData: function(user){
			let that = this;
			let dfdUserIASData = $.Deferred();
			let appModulePAth = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");

			if(user){
				this.IASUserData = this.IASUserData ? this.IASUserData : {};
				
				if(!this.IASUserData[user]){
					$.ajax({
							type: 'GET',
							url: appModulePAth + '/destinations/IDP_Nissan/service/scim/Users/' + user,
							contentType: 'application/json; charset=utf-8',
							dataType: 'json',
							async: false,
							success: function (data, textStatus, jqXHR) {
								dfdUserIASData.resolve(data);
								that.IASUserData[user] = data;
							},
							error: function (jqXHR, textStatus, errorThrown) {
								
							}
						});
				}else{
					dfdUserIASData.resolve(this.IASUserData[user]);
				}
			}
			
			return dfdUserIASData;
		},

		loadCurrentUserData: function () {
			let that = this;
			let dfdCurrentUser = $.Deferred();
			let appModulePAth = jQuery.sap.getModulePath("ardplistapreciosdmsrasa");

			if (this.currentUserData) {
				dfdCurrentUser.resolve(this.currentUserData);
			} else {
				$.ajax({
					type: 'GET',
					dataType: "json",
					url: appModulePAth + "/services/userapi/currentUser",
					success: function (data, textStatus, jqXHR) {
						//that._localModel.setProperty("/CurrentUserData", data);
						that.currentUserData = data;
						dfdCurrentUser.resolve(data);
					},
					error: function (data, textStatus, errorThrown) {
						dfdCurrentUser.resolve(data);
					}
				});
			}

			return dfdCurrentUser;
		},

		isCurrentUserANissanUser: function () {
			let dfdIsNissanUser = $.Deferred();
			let dfdCurrentUserDataIAS = this.loadCurrentUserIASData();

			$.when(dfdCurrentUserDataIAS).then(function (currentUserDataIAS) {
				let isDealerUser = currentUserDataIAS.groups ? currentUserDataIAS.groups.find(group => group.value == "AR_DP_USUARIODEALER" ||
					group.value == "AR_DP_ADMINISTRADORDEALER") : false; //usuarios opuestos a Nissan user: AR_DP_USUARIODEALER y AR_DP_ADMINISTRADORDEALER

				dfdIsNissanUser.resolve(isDealerUser ? false : true);
			});

			return dfdIsNissanUser;
		},
		
		// loadas a json from an url with parameters
		// continuations = {
		//	"success": function(data) {}
		//  "error": function() {}
		// }
		loadJSONModelFromUrl: function(url, parameters, continuations) {
			if (typeof url === "string" && typeof parameters === "string" &&
				typeof continuations === "object" &&
				continuations.hasOwnProperty("success") &&
				continuations.hasOwnProperty("error") &&
				typeof continuations["success"] === "function" &&
				typeof continuations["error"] === "function") {
					const oJSONModel = new JSONModel();
					const bAsync = true;
					oJSONModel.loadData(url, parameters, bAsync).then(
						function() { // Load successful
							continuations["success"](oJSONModel)
						},
						continuations["error"]);
				} else {
					throw "TypeError";
				}
		},
		
		// build solicitante from codigo sucursal
		toSolicitante(codigoSucursal) {
			return "0000" + codigoSucursal;
		},
		getFechaMenosUnMes: function(){
			let fecha = new Date();
			fecha.setMonth( fecha.getMonth() > 0 ? fecha.getMonth() - 1 : 11);
			return fecha;
		},
		
		getConcesionario: function(){
			let dfdConcesionario = $.Deferred();
			this.loadCurrentUserIASData().then(function(datosUsuarioIAS){
				let concesionario = datosUsuarioIAS["urn:sap:cloud:scim:schemas:extension:custom:2.0:User"].attributes.find(attribute => attribute.name == "customAttribute6");
				if(concesionario){
					dfdConcesionario.resolve("0000" + concesionario.value);
				}else{
					dfdConcesionario.resolve();
				}
			});
			
			return dfdConcesionario;
		},
		
		getConcesionarioNissan: function(){
			return "0000239911";
		}

	}
});