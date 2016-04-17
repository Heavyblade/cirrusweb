function loadTable(data) {
		if ( _.isUndefined(data.href) ) { return; } 
		var tableMetadata = getMetadata(data.href.replace("#", ''));

		var baseOptions = {
			width: 	     '100%',
			height:      "auto",
			autoload:    true,
			inserting:   true,
			editing:     true,
			sorting:   	 true,
			paging:    	 true,
			pageLoading: true,
			loadIndication: true,
			loadIndicationDelay: 300,
			deleteConfirm: "Estas seguro de eliminar este registro?",
		};
		
		baseOptions.fields = buildFields(tableMetadata);
		baseOptions.fields.push({type: "control"});
		var neededFields = getNeededFields(tableMetadata);
		
		if ( neededFields.length !== tableMetadata.fields.length && neededFields.length > 0 ) {
			baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""), neededFields.join(","));
		} else {
			baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""));
		}		
		
		var id = tableMetadata.id.replace("/", "").replace(".", "") + Date.now();
		
		$("<li role='presentation'><a id='" + id + "' href='#content" + id + "' aria-controls='home' role='tab' data-toggle='tab'>" + tableMetadata.name + "<i class='tab-close glyphicon glyphicon-remove'></i></a></li>").appendTo(".nav-tabs");
		$("<div id='content" + id + "' role='tabpanel' class='tab-pane' id='messages'><div class='jsGrid' id=grid" + id + "></div></div>").appendTo(".tab-content");

		$("#grid" + id).jsGrid(baseOptions);
		$(".tab-close").on("click", bindCloseTab);
		$('#' + id).tab('show')		
}

function buildLoadData(idRef, fields) {
	console.log(idRef);
	return({
		loadData: function(filter) {
			if (fields) { filter.fields = fields; }
			return $.ajax({
				type: "GET",
				url: ("/api/v1/" + idRef),
				data: filter,
				dataType: "json"
			});
		},
		
		insertItem: function(item) {
			return $.ajax({
				type: "POST",
				url: ("/api/v1/" + idRef),
				data: item,
				dataType: "json"
			});
		},
		
		updateItem: function(item) {
			return $.ajax({
				type: "PUT",
				url: ("/api/v1/" + idRef + "/" + item.id),
				data: item,
				dataType: "json"
			});
		},
		
		deleteItem: function(item) {
			return $.ajax({
				type: "DELETE",
				url: ("/api/v1/" + idRef + "/" + item.id),
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
	return _.chain(table.fields)
			.where({hidden: false})
			.map(function(item) { return {name: item.id, title: item.name, width: 100, type: getjsGridType(item.type)}; })
			.value()
}
function getNeededFields(metadata) {
	return _.chain(metadata.fields)
			.map(function(item) { if ( !item.hidden ) { return item.id; } })
			.compact()
			.value()
}

function getjsGridType(type) {
  var intType = parseInt(type),
	  types   = {
				0: "text",
				1: "text",
				2: "text",
				3: "text",
				4: "text",
				5: "text",
				6: "number",
				7: "customDate",
				8: "customTime",
				9: "customDateTime",
				10: "checkbox",
				111: "customTextArea",
				112: "customTextArea",	
				};
  
  return(types[intType] || "");
}

function bindCloseTab() {
	var contentSelector = $(this).parent().attr("href");
	$(contentSelector).remove();
	$(this).parent().remove();
	return(false);
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
            return value.slice(0, 100);
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

