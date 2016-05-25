function existy(x) {
  return x != null;
}

function cat() {
  var head = _.first(arguments);

  if (existy(head))
    return head.concat.apply(head, _.rest(arguments));
  else
    return [];
}

function construct(head, tail) {
  return cat([head], _.toArray(tail));
}

/**
* @method loadTable
* Este metodo es el responsable por tomar el item de un nodo seleccionado
* y cargar un nuevo tab con los contenidos de la tabla correspondiente.
* @param data {object} - Objeto correpondiente al nodo seleccionado.
*/
function loadTable(data) {
		console.log(data);
		if ( _.isUndefined(data.href) || _.isUndefined(data.indexId) ) { return; }

		var params 		  = { index: data.indexId },
			tableMetadata = getMetadata(data.href.replace("#", '')),
		    id 			  = tableMetadata.id.replace("/", "").replace(".", "") + Date.now(),
			index         = _.find(tableMetadata.indexes, function(item) { return item.id == data.indexId }),
			neededFields  = getNeededFields(tableMetadata, index.parts),
			baseOptions   = { width: 	     	'auto',
							  height:      		'auto',
							  autoload:    		true,
							  inserting:   		true,
							  editing:     		false,
							  sorting:   	 	true,
							  paging:    	 	true,
							  pageLoading: 		true,
							  loadIndication: 	true,
							  rowClick:         rowClickHandler(id),
							  loadIndicationDelay: 300,
							  multiselect:      true,
							  deleteConfirm: "Estas seguro de eliminar este registro?"
							};

		if ( _.isUndefined(data.indexResolve) ) {
			if ( data.indexType == 1 || data.indexType == 4 ) {
				var resolve = prompt("Indique un valor para resolver el indice", "Index Input");
				if ( resolve ) {
					params.indexResolve = resolve;
				} else {
					alert("No pueden obtenerse datos sin valores para la resolución del indice");
				}
			}
		} else {
			params.indexResolve = data.indexResolve;	
		}

		baseOptions.fields 		   = buildFields(tableMetadata, index, id);
		baseOptions.pagerContainer = "#pager" + id;
		if( neededFields.length !== tableMetadata.fields.length && neededFields.length > 0 ) { params.fields = neededFields.join(","); }
		if ( data.ids ) { params.ids = data.ids; }
		if ( data.filterScript ) { params.filterScript = data.filterScript; }
		baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""), params, index);
		
		if ( _.isUndefined( window.selected )) { window.selected = {};}
		window.selected[id] = [];
		
		$(_.template($("#tabTemplate").html())({id: id, name: tableMetadata.name})).appendTo(".nav-tabs");
		$(_.template($("#contentTemplate").html())({id: id,
													mode: tableMetadata.editable ? "editing" : "navigation", 
													isMaster: tableMetadata.tableType == 0 || tableMetadata.tableType == 3,
													editable: tableMetadata.editable})).appendTo(".tab-content");
	
		$("#grid" + id).jsGrid(baseOptions);
		$(".tab-close").on("click", bindCloseTab);
		$('#' + id).tab('show');

		$("input[name=options_" + id + "]").on("change", toggleEditing);
		$("#content" + id + " .nav_plural").on("click", nav_plural(tableMetadata, id, index));
		$("#content" + id + " .nav_master").on("click", nav_master(tableMetadata, id));
		$("#content" + id + " .filter").on("click", filter(tableMetadata));
		$("#content" + id + " .v7_export").on("click", exportToExcel(id, tableMetadata));
		$("#size_" + id).on("change", updateTableSize);
}

/**
* @method buildLoadData
* Este metodo crea las promises de los end-points que serviran al grid que representa la tabla
*
* @param idRef {string} - el id de la tabla que se corresponde con el end-point respetando
* la convencio solucionvdc/tabla que tiene velneo
* @param fields {Array[string]} - Representa los campos que se desean traer de la tabla en cuestion.
* @param index {object} - Un objeto indice proveniente de la metadata de la tabla tal cual llega de back end.
*/
function buildLoadData(idRef, params, index) {
	return({
		loadData: function(filter) {
			return $.ajax({
				type: "GET",
				url: ("/api/v1/" + idRef + "?parts=" + index.parts.join(",")),
				data: _.extend(filter, params),
				dataType: "json"
			});
		},
		
		insertItem: function(item) {
			return $.ajax({
				type: "POST",
				url: ("/api/v1/" + idRef + "?parts=" + index.parts.join(",")),
				data: item,
				dataType: "json"
			});
		},
		
		updateItem: function(item) {
			var parts 		= _.values(_.pick.apply(null, construct(item, index.parts))),
				paramParts  = _.map(parts, function(item){ return "parts=" + item }).join("&");				
			
			return $.ajax({
				type: "PUT",
				url: ("/api/v1/" + idRef + "/" + parts[0] + "?" + paramParts + "&index=" + index.id),
				data: item,
				dataType: "json"
			});
		},
		
		deleteItem: function(item) {
			var parts 		= _.values(_.pick.apply(null, construct(item, index.parts))),
				paramParts  = _.map(parts, function(item){ return "parts=" + item }).join("&");
			return $.ajax({
				type: "DELETE",
				url: ("/api/v1/" + idRef + "/" + parts[0] + "?" + paramParts + "&index=" + index.id),
				data: item,
				dataType: "json"
			});
		},
	});
}

/**
 * exportToExcel
 * This function will export the content of the current data to a excel file.
 * @param id {string} - the id for the current view
 */
function exportToExcel(id, metadata) {
	return(function() {
		var filename = prompt("Nombre para el archivo", "Excel");
		genExcel(("#grid"+id), filename);
		return false;
	});
}


/**
 * updateTableSize
 * Updates de current page size on the current grid as is changed in the input
 */
function updateTableSize() {
	var id 	  = $(this).attr("id").split("_")[1],
		value = parseInt($(this).val());

	if ( value > 0 ) { $("#grid" + id).jsGrid("option", "pageSize", value); }
}

/**
 * Filter will allow to load the table by an index and apply
 * a filter wich will be a javascript function
 * @param table {tableMetadata} - The data of the table
 */
function filter(table) {
	return function() {
			openModal({templateId: "#filter",
					   templateContext: {indexes: table.indexes},
					   title: "Filtrar - " + table.name,
					   successButton: {title: "Filtrar", callback: function() {
								loadTable({href:   	     ("#" + table.id.replace(".", "")),
										   indexResolve: $("#indexResolve").val(),
										   indexId: 	 $("#indexFilterSelect").val(),
										   filterScript: $("#filterScript").val()
								});
					   }}
				
			});
			return false;
	}
}


/**
 * openModal
 * Will open a modal window with an html and and button actions
 * @param opts.templateId {string} - The selector for the template that holds the html
 * @param opts.title {string}      - The title for the modal box
 * @param opts.successButton {object} -The name and callback that will be associated with the succes button
 */
function openModal(opts) {
	    var html = _.template($(opts.templateId).html())(opts.templateContext);

		if ( html != "" && html !== undefined && html !== null ) {
			$('#myModal .modal-body').html(html);
			if ( opts.title ) { $('#myModal h4.modal-title').html(opts.title); }
			if ( opts.successButton ) {
				$('#myModal .btn-primary').html(opts.successButton.title);
				$('#myModal .btn-primary').unbind();
				$('#myModal .btn-primary').on("click", opts.successButton.callback);
				/*
				  var editor = CodeMirror.fromTextArea(document.getElementById("indexFilter"), {
									styleActiveLine: true,
									matchBrackets: true,
									lineNumbers: true,
									theme: "monokai",
									mode: "javascript"
								});
				*/
			 }	
		}		
		
		$("#myModal").modal();
}

/**
 * @function rowClickHandler
 * Create a closure to create global variable that will hold
 * the selected items on the grid
 * @param id {string} The id create for the current grid
 */
function rowClickHandler(id) {
	return function(e) {
			var ev 		  = e.event,
				item  	  = e.item,
				itemIndex = e.itemIndex;
			
			if ( $(ev.target).attr("class") == "selectCheck" ) {
				if ( window.selected[id].indexOf(itemIndex) !== -1 ) {
					window.selected[id].splice(window.selected[id].indexOf(itemIndex), 1);
				} else {
					window.selected[id].push(itemIndex);
				}
			}
	}
}

/**
 * @function getMetadata
 * Will fetch the data for a table based on its tableId
 * @param tableId {string} - full velneo v7 table indentifier solution.vcd/TABLE
 */
function getMetadata(tableId) {
	var data;	
	data = _.find(window.metadata, function(item){ return item.id.replace(".", "") == tableId });
	
	if (data) {
		return(data);
	} else {
		return( _.find(window.metadata, function(item) { return(item.id.split("/")[1] == tableId.split("/")[1]); }) );
	}	
}

function buildFields(table, index, id) {
	var fields = _.chain(table.fields)
				 .where({hidden: false})
				 .map(function(item) {
					var gridType = getjsGridType(item.type);
					return {name: item.id, title: item.name, width: (item.id == "ID" ? 60: gridType[1]), type: gridType[0] };
				 })
				 .value()

	fields.push({type: "control", width: (table.editable ? 100 : 50), editButton: table.editable, deleteButton: table.editable });
	fields.unshift(customSelector(index, id));
	return(fields);
}
function getNeededFields(metadata, parts) {	
	return _.chain(metadata.fields)
			.map(function(item) {
						var esta = parts.indexOf(item.id) > -1;

						if ( item.hidden == false || esta ) {
							return item.id; 
						} 
			})
			.compact()
			.value()
}

function customSelector(index, id) {
	return({headerTemplate: function() {
				return $("<input type='checkbox'>")
						.on("click", function (event) {
							$(this).closest(".jsGrid").find(".jsgrid-grid-body .selectCheck").prop("checked", !$(this).closest(".jsGrid").find(".jsgrid-grid-body .selectCheck").prop("checked"));
							
							if ( $(this).is(":checked") ) {
								var data = $("#grid" + id).jsGrid("option", "data");
								window.selected[id] = _.map(data, function(x, index) { return index; });
							} else {
								window.selected[id] = [];
							}
							event.stopPropagation();
						});
			},
			itemTemplate: function(val, item) {
				var parts = _.values(_.pick.apply(null, construct(item, index.parts))).join(",");
				return $("<input type='checkbox' class='selectCheck' id='" + parts + "'>");
			},			 

			align: "center",
			width: 50,
			height: 50,
			css: "noExl"
    });
}

function getjsGridType(type) {
  var intType = parseInt(type),
	  types   = {
				0:   ["text", 200],
				1:   ["text", 200],
				2:   ["text", 200],
				3:   ["text", 200],
				4:   ["text", 200],
				5:   ["text", 200],
				6:   ["number", 110],
				7:   ["customDate", 120],
				8:   ["customTime", 90],
				9:   ["customDateTime", 150],
				10:  ["checkbox", 60],
				111: ["customTextArea",200],
				112: ["customTextArea", 200]
				};
  
  return(types[intType] || "");
}

function bindCloseTab() {
	var contentSelector = $(this).parent().attr("href");
	$(contentSelector).remove();
	$(this).parent().remove();
	if ( $(".nav-tabs li a").length > 0 ) {
		$($(".nav-tabs li a")[$(".nav-tabs li a").length-1]).tab("show");
	}
	return(false);
}

function toggleEditing() {
	var id 		= $(this).attr("id").split("_")[1],
		element = $(this).attr("id").split("_")[0];
	
	if ( element == "edit" ) {
		$("#grid" + id).jsGrid("option", "editing", true);
		// $("#grid" + id + " .jsgrid-grid-header tr th:first-child").hide();
		// $("#grid" + id + " .jsgrid-grid-body tr td:first-child").hide();
	} else {
		$("#grid" + id).jsGrid("option", "editing", false);
		// $("#grid" + id + " .jsgrid-grid-header tr th:first-child").show();
		// $("#grid" + id + " .jsgrid-grid-body tr td:first-child").show();
	}	
}

function nav_plural(table, id, index) {
	return function() {
		var _this = this;
		swal({	title: 				"Escoger plural para " + table.name, 
				text: 				_.template($("#pluralsList").html())({plurals: _.map(table.plurals, function(x) { return {table: x.boundedTable.replace(".", "").replace("@", "/"), index: x.boundedIndexId, name: x.name }; })}),
				html: 				true,
				showCancelButton: 	true,
				confirmButtonColor: "#DD6B55",
				confirmButtonText: 	"Cargar",
				cancelButtonText: 	"Cancelar",
				closeOnConfirm: 	true,
				closeOnCancel: 		true
				},
				function(isConfirm){
					var plural = $("#pluralSelect").val();
					if( plural !== "") {
						var table = plural.split("#")[0],
							index = plural.split("#")[1],
							ids   = getSelectedIds(id, null, $(_this).attr("href") == "#all");
						
						if ( $(_this).attr("href") !== "#all" && ids.length == 0 ) {
							setTimeout(function() {swal("No hay elementos seleccionados");}, 1000);							
							return;
						} else {
							loadTable({
								href: ("#" + table),
								ids: ids,
								indexId: index
							});
						}
					}
				
		});
		return false;
	}  
}

function nav_master(table, id) {
	return function() {
			var _this = this;
			swal({	title: 				"Escoger Maestros para " + table.name, 
					text: 				_.template($("#mastersList").html())({masters: table.masters}),
					html: 				true,
					showCancelButton: 	true,
					confirmButtonColor: "#DD6B55",
					confirmButtonText: 	"Cargar",
					cancelButtonText: 	"Cancelar",
					closeOnConfirm: 	true,
					closeOnCancel: 		true
					},
					function(isConfirm){
						var master = $("#masterSelect").val();
						if( master !== "") {
							var table 	    = master.split("#")[0].replace(".", "").replace("@", "/"),
								localField  = master.split("#")[1],
								ids         = getSelectedIds(id, localField, $(_this).attr("href") == "#all");
							
							if ( $(_this).attr("href") !== "#all" && ids.length == 0 ) {
								setTimeout(function() {swal("No hay elementos seleccionados");}, 1000);							
								return;
							} else {
								loadTable({
									href: ("#" + table),
									ids: ids,
									indexId: "ID"
								});								
							}
						}
					
			});
			return false;
	} 
}

function getSelectedIds(id, localField, all) {	
	var data 	= $("#grid" + id).jsGrid("option", "data"),
	    indexes = window.selected[id],
		ids;
	
	if (all) {
		return _.uniq( _.map(data, function(item){ return item[localField || "ID"]; }));
	} else if (indexes.length > 0) {
		return _.uniq(_.map(indexes, function(item){ return(data[item][localField || "ID"]); }));
	}
	
	return([]);
}

function addDateType() {
	var MyDateField = function(config) {
        jsGrid.Field.call(this, config);
    };
 
    MyDateField.prototype = new jsGrid.Field({
        sorter: function(date1, date2) {
            return new Date(date1) - new Date(date2);
        },
 
        itemTemplate: function(value) {
            return moment(value).format("YYYY-MM-DD");
        },
 
        insertTemplate: function(value) {
            return this._insertPicker = $("<input type='text' class='form-control'/>").datetimepicker({showTodayButton: true, viewMode: "days", format: "YYYY-MM-DD"});
        },
 
        editTemplate: function(value) {
			return this._editPicker = $("<input type='text' class='form-control' value='" + value + "'/>").datetimepicker({showTodayButton: true, viewMode: "days", format: "YYYY-MM-DD"});
        },
 
        insertValue: function() {
            return this._insertPicker.val();
        },
 
        editValue: function() {
            return this._editPicker.val();
        }
    });
 
    jsGrid.fields.customDate = MyDateField;
}

function addDateTimeType() {
	var MyDateField = function(config) {
        jsGrid.Field.call(this, config);
    };
 
    MyDateField.prototype = new jsGrid.Field({
        sorter: function(date1, date2) {
            return new Date(date1) - new Date(date2);
        },
 
        itemTemplate: function(value) {
            return moment(value).format("YYYY-MM-DD hh:mm:ss");
        },
 
        insertTemplate: function(value) {
            return this._insertPicker = $("<input type='text' class='form-control'/>").datetimepicker({showTodayButton: true, format: "YYYY-MM-DD hh:mm:ss"});
        },
 
        editTemplate: function(value) {
			return this._editPicker = $("<input type='text' class='form-control' value='" + moment(value).format("YYYY-MM-DD hh:mm:ss") + "'/>").datetimepicker({showTodayButton: true, format: "YYYY-MM-DD hh:mm:ss"});
        },
 
        insertValue: function() {
            return this._insertPicker.val();
        },
 
        editValue: function() {
            return this._editPicker.val();
        }
    });
 
    jsGrid.fields.customDateTime = MyDateField;	
}

function addTimeType() {
	var MyDateField = function(config) {
        jsGrid.Field.call(this, config);
    };
 
    MyDateField.prototype = new jsGrid.Field({
        sorter: function(date1, date2) {
            return new Date(date1) - new Date(date2);
        },
 
        itemTemplate: function(value) {
            return moment(value).format("LT");
        },
 
        insertTemplate: function(value) {
            return this._insertPicker = $("<input type='text' class='form-control'/>").datetimepicker({format: "LT"});
        },
 
        editTemplate: function(value) {
			return this._editPicker = $("<input type='text' class='form-control' value='" + moment(value).format("LT") + "'/>").datetimepicker({format: "LT"});
        },
 
        insertValue: function() {
            return this._insertPicker.val();
        },
 
        editValue: function() {
            return this._editPicker.val();
        }
    });
 
    jsGrid.fields.customTime = MyDateField;		
}

function addCustomTextArea() {
	var MyDateField = function(config) {
        jsGrid.Field.call(this, config);
    };
 
    MyDateField.prototype = new jsGrid.Field({
        sorter: function(string1, string2) {
            return string1 > string2
        },
 
        itemTemplate: function(value) {
            return _.escape(value.slice(0, 30));
        },
 
        insertTemplate: function(value) {
            return this._insertPicker = $("<textarea rows='7' class='form-control'></textarea>");
        },
 
        editTemplate: function(value) {
			return this._editPicker = $("<textarea rows='7' class='form-control'>" + value + "</textarea>");
        },
 
        insertValue: function() {
            return this._insertPicker.val();
        },
 
        editValue: function() {
            return this._editPicker.val();
        }
    });
 
    jsGrid.fields.customTextArea = MyDateField;	
}

function addFieldToRender(event, node) {
	var parent   = $('#tree').treeview('getParent', node),
		parent   = $('#tree').treeview('getParent', parent),
		tableId  = parent.href.replace("#", ""),
		metadata = getMetadata(tableId),
		fieldId  = node.fieldId,
		field    = _.find(metadata.fields, function(item) { return item.id == fieldId });
	
	field.hidden = !field.hidden;
}

$(document).ready(function(){
	 addDateType();
	 addDateTimeType();
	 addTimeType();
	 addCustomTextArea()
	$(".tab-close").on("click", bindCloseTab);	
});