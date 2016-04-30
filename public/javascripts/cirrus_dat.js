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
							  editing:     		tableMetadata.editable,
							  sorting:   	 	true,
							  paging:    	 	true,
							  pageLoading: 		true,
							  loadIndication: 	true,
							  loadIndicationDelay: 300,
							  multiselect:      true,
							  deleteConfirm: "Estas seguro de eliminar este registro?"
							};

		if ( data.indexType == 1 || data.indexType == 4 ) {
			var resolve = prompt("Indique un valor para resolver el indice", "Index Input");
			if ( resolve ) {
				params.indexResolve = resolve;
			} else {
				alert("No pueden obtenerse datos sin valores para la resolución del indice")
			}
		}

		baseOptions.fields 		   = buildFields(tableMetadata);
		baseOptions.pagerContainer = "#pager" + id;
		if( neededFields.length !== tableMetadata.fields.length && neededFields.length > 0 ) { params.fields = neededFields.join(","); }
		baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""), params, index);
		
		$(_.template($("#tabTemplate").html())({id: id, name: tableMetadata.name})).appendTo(".nav-tabs");
		$(_.template($("#contentTemplate").html())({id: id, mode: tableMetadata.editable ? "editing" : "navigation"})).appendTo(".tab-content");
	
		$("#grid" + id).jsGrid(baseOptions);
		$(".tab-close").on("click", bindCloseTab);
		$('#' + id).tab('show');

		$("input[name=options_" + id + "]").on("change", toggleEditing);
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

function getMetadata(tableId) {
	return(_.find(window.metadata, function(item){ return item.id.replace(".", "") == tableId }));
}

function buildFields(table) {
	var fields = _.chain(table.fields)
				 .where({hidden: false})
				 .map(function(item) {
					var gridType = getjsGridType(item.type);
					return {name: item.id, title: item.name, width: (item.id == "ID" ? 60: gridType[1]), type: gridType[0] };
				 })
				 .value()

	fields.push({type: "control", width: (table.editable ? 100 : 50), editButton: table.editable, deleteButton: table.editable });
	fields.unshift(customSelector());
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

function customSelector() {
	return({headerTemplate: function() {
				return $("<input type='checkbox'>")
						.on("click", function (event) {
							$(this).closest(".jsGrid").find(".jsgrid-grid-body .selectCheck").prop("checked", !$(this).closest(".jsGrid").find(".jsgrid-grid-body .selectCheck").prop("checked"));
							event.stopPropagation();
						});
			},
			itemTemplate: function(_, item) {	  
				return $("<input type='checkbox' class='selectCheck'>")
						.on("change", function (event) {
							event.stopPropagation();
						});
			},
			align: "center",
			width: 50,
			height: 50
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
				7:   ["customDate", 100],
				8:   ["customTime", 70],
				9:   ["customDateTime", 130],
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
		$("#grid" + id + " .jsgrid-grid-header tr th:first-child").hide();
		$("#grid" + id + " .jsgrid-grid-body tr td:first-child").hide();
	} else {
		$("#grid" + id).jsGrid("option", "editing", false);
		$("#grid" + id + " .jsgrid-grid-header tr th:first-child").show();
		$("#grid" + id + " .jsgrid-grid-body tr td:first-child").show();
	}	
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
			console.log(value)
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
			console.log(value)
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