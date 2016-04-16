function loadTable(data) {
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
		baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""));
		
		var id = tableMetadata.id.replace("/", "").replace(".", "") + Date.now();
		
		$("<li role='presentation'><a id='" + id + "' href='#content" + id + "' aria-controls='home' role='tab' data-toggle='tab'>" + tableMetadata.name + "<i class='tab-close glyphicon glyphicon-remove'></i></a></li>").appendTo(".nav-tabs");
		$("<div id='content" + id + "' role='tabpanel' class='tab-pane' id='messages'><div class='jsGrid' id=grid" + id + "></div></div>").appendTo(".tab-content");

		$("#grid" + id).jsGrid(baseOptions);
		$(".tab-close").on("click", bindCloseTab);
		$('#' + id).tab('show')		
}

function buildLoadData(idRef) {
	console.log(idRef);
	return({
		loadData: function(filter) {
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
	var fields = _.map(table.fields, function(item){
		var field = {name: item.id, title: item.name, width: 100, type: getjsGridType(item.type)}
		if ( item.type == 10 ) { field.title = item.name;}
		return field;
	});
	return fields;
}

function getjsGridType(type) {
  var intType = parseInt(type);
  var result;
  switch (intType) {
    case 0:
       result = "text";
       break;
    case 1:
       result = "text";
       break;
    case 2:
       result = "text";
       break;
    case 3:
       result = "text";
       break;
    case 4:
       result = "text";
       break;
    case 5:
       result = "text";
       break;
    case 6:
       result = "text";
       break;
    case 7:
       result = "customDate";
       break;
    case 8:
       result = "customTime";
       break;
    case 9:
       result = "customDateTime";
       break;
    case 10:
       result = "checkbox";
       break;
    case 11:
       result = "";
       break;
    case 12:
       result = "";
       break;
    case 13:
       result = "";
       break;
    case 14:
       result = "";
       break;
    case 15:
       result = "";
       break;
    case 18:
       result = "";
       break;
	case 111:
	   result = "textarea";
	   break;
	case 112:
	   result = "textarea";
	   break;
    default:
       result = "text";
       break;
  }
  return(result);
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

$(document).ready(function(){
	 addDateType();
	 addDateTimeType();
	 addTimeType();
	$(".tab-close").on("click", bindCloseTab);	
});

