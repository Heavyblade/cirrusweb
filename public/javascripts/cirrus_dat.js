/**
* Allow to serialize a form as a JSON object.
*/
$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

function existy(x) {
 return x !== null && x !== undefined;
}

// toma un listado de arrays en los parametros los concatena y
// devuelve un solo array sumandolos todos
// [1], [2,3], [4,5,6]
// a
// [1, 2, 3, 4, 5, 6]
function cat(/* arguments */) {
  var head = _.first(arguments);
  return(existy(head) ? head.concat.apply(head, _.rest(arguments)) : [] );
}

/**
 * concatena un elemento al frente de un array
 * @param  {string|int|float} head  - Elemento a añadir al array.
 * @param  {array} tail - Array para añadir el elemento.
 * @return void
 */
function construct(head, tail) {
  return cat([head], _.toArray(tail));
}

/**
* @method loadTable
* Este metodo es el responsable por tomar el item de un nodo seleccionado
* y cargar un nuevo tab con los contenidos de la tabla correspondiente.
* @param data {object} - Objeto correpondiente al nodo seleccionado.
*/
function loadTable(data, _options) {

    var params          = { index: data.indexId },
        tableMetadata   = getMetadata(data.href.replace("#", '')),
        id              = tableMetadata.id.replace("/", "").replace(".", "") + Date.now(),
        index           = _.find(tableMetadata.indexes, function(item) { return item.id == data.indexId; }),
        neededFields    = getNeededFields(tableMetadata, index.parts),
        defaultOptions  = { width:               'auto',
                            height:              'auto',
                            autoload:            true,
                            inserting:           true,
                            editing:             false,
                            sorting:             true,
                            paging:              true,
                            pageLoading:         true,
                            loadIndication:      true,
                            rowClick:            rowClickHandler(id),
                            loadIndicationDelay: 300,
                            multiselect:         true,
                            pagerContainer:      ("#pager" + id),
                            fields:              buildFields(tableMetadata, index, id),
                            deleteConfirm:       "Estas seguro de eliminar este registro?"
                          },
        baseOptions     = _.defaults(_options || {}, defaultOptions);

    _.extend(params, _.pick(data, "ids", "filterScript", "indexResolve"));
    if ( !_.isUndefined(data.query) && !_.isUndefined(data.query.params) ) { _.extend(params, data.query.params); }
    window.selected[id] = [];

    // Si el indice seleccionado debe de ser resuelto
    if ( data.indexType == 1 || data.indexType == 4 ) {
        if ( _.isUndefined(data.indexResolve) ) {
            params.indexResolve = prompt("Indique un valor para resolver el indice", "Index Input");

            if ( _.isNull(data.indexResolve) ) {
                alert("No pueden obtenerse datos sin valores para la resolución del indice");
                return;
            }
        }
    }

    if ( neededFields.length !== tableMetadata.fields.length && neededFields.length > 0 ) { params.fields = neededFields.join(","); }
    baseOptions.controller = buildLoadData(tableMetadata.id.replace(".", ""), params, index, data.data, data.query);

    $(_.template($("#tabTemplate").html())({id: id, name: tableMetadata.name})).appendTo(".nav-tabs");
    $(_.template($("#contentTemplate").html())({id:       id,
                                                mode:     tableMetadata.editable ? "editing" : "navigation",
                                                isMaster: tableMetadata.tableType === 0 || tableMetadata.tableType === 3,
                                                editable: tableMetadata.editable})).appendTo(".tab-content");

    $("#grid" + id).jsGrid(baseOptions);
    $(".tab-close").on("click", bindCloseTab);
    $('#' + id).tab('show');
    $("input[name=options_" + id + "]").on("change", toggleEditing);
    $("#content" + id + " .nav_plural").on("click", nav_plural(tableMetadata, id, index));
    $("#content" + id + " .nav_master").on("click", nav_master(tableMetadata, id));
    $("#content" + id + " .filter").on("click", filter(id));
    $("#content" + id + " .v7_export").on("click", exportToExcel(id, tableMetadata));
    $("#content" + id + " .processes").on("click", showProcesses(id, tableMetadata));
    $("#size_" + id).on("change", updateTableSize);
    $("#refresh_" + id).on("click", function() { $("#grid" + id).jsGrid("loadData"); });
    $("#eliminar_" + id).on("click", deleteItems(id, tableMetadata.id, index));

    // Necesario para recalcular size en render de data estatica.
    if ( !_.isUndefined(data.data) ) { setTimeout(function() { $("#grid" + id).jsGrid("refresh"); }, 1000); }
}

/**
* Este metodo crea las promises de los end-points que serviran al grid que representa la tabla
*
* @param idRef  {string} - el id de la tabla que se corresponde con el end-point respetando la convencio solucionvdc/tabla que tiene velneo
* @param params {object} - Parametros extra a añadir en cada petición.
* @param index  {object} - Un objeto indice proveniente de la metadata de la tabla tal cual llega de back end.
* @param data   {Array}  - Data fuente para construir el grid.
*/
function buildLoadData(idRef, params, index, data, query) {
  _.extend(params, {token: window.token, token_script: window.token_script});
  return({
    base: {idRef: idRef, params: params, index: index, data: data, query: query},
    loadData: function(filter) {
                // Para casos de registros estáticos provenientes de un proceso.
                if( !_.isUndefined(data) ) {
                      var from = ((filter.pageIndex - 1)  * filter.pageSize),
                          to   = from + filter.pageSize -1;

                      return({data: data.slice(from, to), itemsCount: data.length});

                // Usando una busqueda como fuente de datos.
                } else if ( !_.isUndefined(query) ) {
                      return $.ajax({ type: "GET",
                                      url: ("/api/v1/query/" + query.id),
                                      data: _.extend(filter, params),
                                      dataType: "json"
                             });
                // Funcionamiento normal con tabla e indice
                } else if ( !_.isUndefined(idRef) ) {
                      return $.ajax({ type: "GET",
                                      url: ("/api/v1/" + idRef + "?parts=" + index.parts.join(",")),
                                      data: _.extend(filter, params),
                                      dataType: "json"
                             });
                }
    },

    insertItem: function(item) {
      return $.ajax({
        type: "POST",
        url: ("/api/v1/" + idRef + "?parts=" + index.parts.join(",") + "&token=" + window.token + "&token_script=" + window.token_script),
        data: item,
        dataType: "json"
      });
    },

    updateItem: function(item) {
      var parts     = _.values(_.pick.apply(null, construct(item, index.parts))),
        paramParts  = _.map(parts, function(item){ return("parts=" + item); }).join("&");

      return $.ajax({
        type: "PUT",
        url: ("/api/v1/" + idRef + "/" + parts[0] + "?" + paramParts + "&index=" + index.id + "&token=" + window.token + "&token_script=" + window.token_script),
        data: item,
        dataType: "json"
      });
    },

    deleteItem: function(item) {
      var parts     = _.values(_.pick.apply(null, construct(item, index.parts))),
        paramParts  = _.map(parts, function(item){ return("parts=" + item); }).join("&");
      return $.ajax({
        type: "DELETE",
        url: ("/api/v1/" + idRef + "/" + parts[0] + "?" + paramParts + "&index=" + index.id + "&token=" + window.token + "&token_script=" + window.token_script),
        data: item,
        dataType: "json"
      });
    },
  });
}

/**
* Muestra un form html donde el usuario selecciona el proceso y las variables
* de entrada
* @param metada {object} -un objecto JSON con la representación de una tabla.
*/
function showProcesses(id, metadata) {
    return(function(){
        if ( (metadata.processes || []).length > 0 ) {
            openModal({templateId:      "#process",
                       templateContext: {processes: metadata.processes},
                       title:           "Seleccionar proceso",
                       afterCallback:   bindSelect(metadata),
                       successButton:   { title:    "Ejecutar", callback: executeProcess(id, metadata.id) }
            });
        } else {
            swal({title: "Mensaje",
                  text:  "No hay procesos asociados",
                  type:  "error"
            });
        }
    });
}

/**
 * Ejecuta una determinada busqueda
 *
 * @param query {object} - La representación de un vQuery de Velneo que llega en el payload
 */
function executeQuery(query) {
    if ( query.vars.length > 0 ) {
        openModal({templateId:      "#execQuery",
                   templateContext: {id: query.id},
                   title:           "Ejecutar Búsqueda",
                   afterCallback:   addQueryVars(query),
                   successButton:   { title: "Buscar", callback: requestQuery(query) }
        });
    } else {
      requestQuery(query)();
    }
}

/**
 * Añade al form html los inputs con las variables que tenga el la busqueda de Velneo
 *
 * @param query {object} - La representación de un vQuery de Velneo que llega en el payload
 */
function addQueryVars(query) {
    return(function() {
        var html = _.template($("#vars").html())({vars: query.vars});
        $("#vars_container").html(html);
    });
}


/**
 * Realiza la llamada al API para que se tome como fuente de registros una búsqueda
 * @param vQuery {object} -  La representación de un vQuery de Velneo que llega en el payload
 */
function requestQuery(vQuery) {
    return(function() {
          var data = $("#query_form").serializeObject(),
              quer = data.query.replace(".", "");

          var table        = getMetadata(vQuery.outputTable),
              defaultIndex = _.find(table.indexes, function(item) { return item.type == 0 });

          vQuery.params = data;
          loadTable({href:    vQuery.outputTable,
                     indexId: defaultIndex.id,
                     query:   vQuery,
          });
          $("#myModal").modal("hide");
    });
}

/**
* Crea un closure para hacer binding al cambio de proceso para mostrar las
* variables del mismo.
* @param metadata {object} -un objecto JSON con la representación de una tabla.
*/
function bindSelect(metadata) {
    var addFields = function() {
                      var selected = $("#process_id").val();
                      var proc = _.find(metadata.processes, function(item){ return(item.id == selected); });
                      if ( proc ) {
                         var html = _.template($("#vars").html())({vars: proc.vars});
                         $("#vars_container").html(html);
                      }
    };

    setTimeout(addFields, 1000)
    return(function() {
            $('#process_id').unbind();
            $("#process_id").on("change", addFields);
    });
}

/**
* Toma los parametros del form y realizar un request al Rest API para ejecutar el proceso
* con un set de parametros especificos.
* @param id {string} - El id correspondiente al tab con el que se este trabajando.
* @param tableId {string} - El idRef de la tabla de origen del proceso.
*
* @returns {function} - La función que servirá como callback para la ejcución del proceso.
*/
function executeProcess(id, tableId) {
    return(function(){
          var data = $("#process_form").serializeObject(),
              proc = data.proceso.replace(".", "");

          delete(data.proceso);

          if ( !_.isUndefined(id) && !_.isUndefined(tableId) ) {
            var ids      = getSelectedIds(id);
            data.ids     = ids;
            data.tableId = tableId.replace(".", "");
          }

          $.ajax({type:     "POST",
                  url:      "/api/v1/exec_proc/" + proc + "?token=" + window.token + "&token_script=" + window.token_script,
                  data:     data,
                  dataType: "json",
                  success:  function(result) {
                                $("#myModal").modal("hide");
                                if ( result.message == "success" ) {
                                    swal({title: "Mensaje",
                                          text:  "El proceso se ha ejecutado exitosamente",
                                          type:  "success",
                                          timer: 1000
                                    });

                                    if ( !_.isUndefined(result.outputTable) ) {
                                            loadTable({
                                                href:    result.outputTable.replace(".", ""),
                                                indexId: result.index.id,
                                                data:    result.data
                                            });
                                    }
                                } else {
                                  swal({title: "Mensaje",
                                        text:  "Ha habido un problema ejecutando el proceso",
                                        type:  "error",
                                        timer: 1000
                                  });
                                }
                  },
                  error: function() {
                            $("#myModal").modal("hide");
                            swal({title: "Mensaje",
                                  text:  "Ha habido un problema ejecutando el proceso",
                                  type:  "error"
                            });
                  }
          });
    });
}

/**
 * Esta funcion exportara el contenido del grid actual a un archivo de excel.
 * @param id {string} - the id for the current view
 * @param metadata {object} -un objecto JSON con la representación de una tabla.
 */
function exportToExcel(id, metadata) {
    return(function() {
      var filename = prompt("Nombre para el archivo", "Excel");
      genExcel(("#grid"+id), filename);
      return false;
    });
}

/**
* Esta funcion tomara los registros seleccionados y los eliminará uno por uno
* @param id    {string} - the id for the current view.
* @param index {object} - el objeto index con el que se trabaja la tabla actual.
*/
function deleteItems(id, idRef, index) {
    return(function() {
          var data    = $("#grid" + id).jsGrid("option", "data"),
              indexes = window.selected[id],
              items   = _.map(indexes, function(item){ return(data[item]); });

          if ( confirm("Esta Seguro que desea eliminar los registros seleccionaods ?") ) {
              _.each(items, function(item){
                    var parts       = _.values(_.pick.apply(null, construct(item, index.parts))),
                        paramParts  = _.map(parts, function(item) { return("parts=" + item); }).join("&");
                    
                    $.ajax({
                      type: "DELETE",
                      url: ("/api/v1/" + idRef + "/" + parts[0] + "?" + paramParts + "&index=" + index.id + "&token=" + window.token + "&token_script=" + window.token_script),
                      data: item,
                      dataType: "json"
                    });   
              });
          }

          $("#grid" + id).jsGrid("loadData");
    });
}

/**
 * Realiza un update a la tabla cuando se cambia el numero de fichas por página.
 * @return {void}
 */
function updateTableSize() {
  var id    = $(this).attr("id").split("_")[1],
      value = parseInt($(this).val());

  if ( value > 0 ) { $("#grid" + id).jsGrid("option", "pageSize", value); }
}

/**
 * Filter will allow to load the table by an index and apply
 * @param  {table} table [description]
 */
function filter(id) {
  return function() {
      openModal({templateId:      "#filter",
                 templateContext: {},
                 title:           "Filtrar",
                 successButton: {title: "Filtrar",
                                 callback: function() {
                                            var otro = $("#grid" + id).jsGrid("option", "controller").base
                                            otro.params.filterScript = $("#filterScript").val();
                                            $("#grid" + id).jsGrid("option", "controller", buildLoadData(otro.idRef, otro.params, otro.index, otro.data, otro.query) );
                                            $("#myModal").modal("hide");
                                 }
                 }
      });
      return false;
  };
}

/**
 * Muestra un modal con el html dado y acciones en botones
 * @param opts.templateId      {string}   - El selector css para el template que se renderizará.
 * @param opts.templateContext {object} - Objecto json que será el contexto para el template.
 * @param opts.title           {string}   - Titulo para el modal
 * @param opts.successButton   {object}   - Opciones para el boton de acción, asignando un text y callback
 */
function openModal(opts) {
      var html = _.template($(opts.templateId).html())(opts.templateContext);

    if ( html !== "" && html !== undefined && html !== null ) {
      $('#myModal .modal-body').html(html);

      $("#myModal").on("shown.bs.modal", function(){
          if ( opts.title ) { $('#myModal h3.modal-title').html(opts.title); }
          if ( opts.afterCallback ) { opts.afterCallback(); }
          if ( opts.successButton ) {
              $('#myModal .btn-primary').html(opts.successButton.title);
              $('#myModal .btn-primary').unbind();
              $('#myModal .btn-primary').on("click", opts.successButton.callback);


           }
      });

    }

    $("#myModal").modal();
}

/**
 * Crea un closure con id global del tab para responder al evento clikc
 * en cada linea de la tabla.
 * @param id {string} - EL id global del tab actual
 */
function rowClickHandler(id) {
  return function(e) {
      var ev      = e.event,
        item      = e.item,
        itemIndex = e.itemIndex;

      if ( $(ev.target).attr("class") == "selectCheck" ) {
        if ( window.selected[id].indexOf(itemIndex) !== -1 ) {
          window.selected[id].splice(window.selected[id].indexOf(itemIndex), 1);
        } else {
          window.selected[id].push(itemIndex);
        }
      }
  };
}

/**
 * Will fetch the data for a table based on its tableId
 * @param tableId {string} - full velneo v7 table indentifier solution.vcd/TABLE
 */
function getMetadata(tableId) {
    var data = _.find(window.metadata, function(item){ return(item.id.replace(".", "") == tableId); });

    if (data) {
      return(data);
    } else {
      return( _.find(window.metadata, function(item) { return(item.id.split("/")[1] == tableId.split("/")[1]); }) );
    }
}

/**
 * Construye el input que tomara la tabla a construir
 * @param  {object} table [ Metadata de la tabla para los campos ]
 * @param  {object} index [ Objeto index para construir la columna de selccion ]
 * @param  {string} id    [ Id unico de la tabla ]
 * @return {object}       [ Mapeo de campos para la tabla ]
 */
function buildFields(table, index, id) {
    var fields = _.chain(table.fields)
           .where({hidden: false})
           .map(function(item) {
            var gridType = getjsGridType(item.type);
            return {name: item.id, title: item.name, width: (item.id == "ID" ? 60: gridType[1]), type: gridType[0] };
           })
           .value();

    fields.push({type: "control", width: (table.editable ? 100 : 50), editButton: table.editable, deleteButton: table.editable });
    fields.unshift(customSelector(index, id));
    return(fields);
}

/**
 * Obtiene los campos seleccionados para solicitar a backend.
 * @param  {object} metadata [ Metadata de la tabla para los campos ]
 * @param  {array} parts     [ array con las partes del indice,
 * para garantizar que siempre esten los campos que componen el indice sobre el que se esta trabajando ]
 */
function getNeededFields(metadata, parts) {
    return _.chain(metadata.fields)
        .map(function(item) {
              var esta = parts.indexOf(item.id) > -1;
              if ( item.hidden === false || esta ) { return item.id; }
        })
        .compact()
        .value();
}

/**
 * Crea input que se usa de base para cada fila
 * @param  {object} index [ Index parts ]
 * @param  {string} id    [ Id único de la tabla ]
 * @return {object}       [ Entrega el objeto que representa el campo ]
 */
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

/**
 * Mapea los tipos de dato de V7 a el
 * tipo de dato de jsGrid
 * @param  {int} type [ tipo de dato v7 ]
 * @return {array}    [ [tipo de dato jsGrid, length] ]
 */
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

/**
 * Se encarga de hacer el binding para cerrar el tab garantizando que
 * alguna quede seleccionada
 */
function bindCloseTab() {
    var contentSelector = $(this).parent().attr("href");
    $(contentSelector).remove();
    $(this).parent().remove();
    if ( $(".nav-tabs li a").length > 0 ) {
      $($(".nav-tabs li a")[$(".nav-tabs li a").length-1]).tab("show");
    }
    return(false);
}

/**
 * Habilita / Deshabilita la edición en la rejilla.
 */
function toggleEditing() {
    var id    = $(this).attr("id").split("_")[1],
      element = $(this).attr("id").split("_")[0];

    if ( element == "edit" ) {
      $("#grid" + id).jsGrid("option", "editing", true);
    } else {
      $("#grid" + id).jsGrid("option", "editing", false);
    }
}

/**
 * Crea el closure para ejecutar cuando se desee navegar por los plurales de
 * para navegar por ellos
 * @param  {object} table [ Metadata de la tabla para los campos ]
 * @param  {object} index [ Objeto index para construir la columna de selccion ]
 * @param  {string} id    [ Id único de la tabla ]
 * @return {function}     [ La funcion a ejecutar cuando se desee navegar por los plurales ]
 */
function nav_plural(table, id, index) {
    return function() {
      var _this = this;
      swal({ title:          "Escoger plural para " + table.name,
          text:               _.template($("#pluralsList").html())({plurals: _.map(table.plurals, function(x) { return {table: x.boundedTable.replace(".", "").replace("@", "/"), index: x.boundedIndexId, name: x.name }; })}),
          html:               true,
          showCancelButton:   true,
          confirmButtonColor: "#DD6B55",
          confirmButtonText:  "Cargar",
          cancelButtonText:   "Cancelar",
          closeOnConfirm:     true,
          closeOnCancel:      true
          },
          function(isConfirm){
            var plural = $("#pluralSelect").val();
            if( plural !== "") {
              var table = plural.split("#")[0],
                index = plural.split("#")[1],
                ids   = getSelectedIds(id, null, $(_this).attr("href") == "#all");

              if ( $(_this).attr("href") !== "#all" && ids.length === 0 ) {
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
    };
}

/**
 * Crea el closure para ejecutar cuando se desee navegar por los maestros de la tabla
 * @param  {object} table [ Metadata de la tabla para los campos ]
 * @param  {string} id    [ Id único de la tabla ]
 * @return {function}     [ La funcion a ejecutar cuando se desee navegar por los maestros ]
 */
function nav_master(table, id) {
    return function() {
        var _this = this;
        swal({ title:           "Escoger Maestros para " + table.name,
            text:               _.template($("#mastersList").html())({masters: table.masters}),
            html:               true,
            showCancelButton:   true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText:  "Cargar",
            cancelButtonText:   "Cancelar",
            closeOnConfirm:     true,
            closeOnCancel:      true
            },
            function(isConfirm){
              var master = $("#masterSelect").val();
              if( master !== "") {
                var table     = master.split("#")[0].replace(".", "").replace("@", "/"),
                  localField  = master.split("#")[1],
                  ids         = getSelectedIds(id, localField, $(_this).attr("href") == "#all");

                if ( $(_this).attr("href") !== "#all" && ids.length === 0 ) {
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
    };
}

/**
 * Obtiene los ids de las filas seleccionadas
 * @param  {string}  id         [ Id único de la tabla ]
 * @param  {string } localField [ Nombre del campo para recoger los ids ]
 * @param  {bool}    all        [ Indicativo de si se desea tomar todos los campos]
 * @return {array}              [ Array de ids ]
 */
function getSelectedIds(id, localField, all) {
    var data    = $("#grid" + id).jsGrid("option", "data"),
        indexes = window.selected[id],
        ids;

        if ( indexes.length > 0 ) {
            return _.uniq(_.map(indexes, function(item){ return(data[item][localField || "ID"]); }));
        } else {
            return _.uniq( _.map(data, function(item){ return item[localField || "ID"]; }));
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
            return(string1 > string2);
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
  var grandparent   = $('#tree').treeview('getParent', node),
      parent        = $('#tree').treeview('getParent', grandparent),
      tableId       = parent.href.replace("#", ""),
      metadata      = getMetadata(tableId),
      fieldId       = node.fieldId,
      field         = _.find(metadata.fields, function(item) { return(item.id == fieldId); });

  field.hidden = !field.hidden;
}

function toggleJsConsole() {
    var id = $(this).attr("id");

    if ( id == "navigation_mode" ) {
        $("#navigation_container").show();
        $("#js_container").hide();
    } else {
        $("#navigation_container").hide();
        $("#js_container").show();
    }
}

function execScript() {
    var code = window.editor.getValue();
    $.ajax({type: "POST",
            url: "/api/v1/js_console?token=" + window.token + "&token_script=" + window.token_script,
            dataType: "json",
            data: {script: code},
            success: function(result) {
                     _.each(result.log || [], function(line){
                          if ( typeof(line) == "object" ) {
                              var id    = '' + Date.now(),
                                  item  = $("<tr><td id='" + id  + "'></td></tr>");
                                  
                                  item.appendTo($("#outputList"));
                                  $("#" + id).JSONView(line, { collapsed: true });
                          } else {
                              var item = $("<tr><td>" + line  + "</td></tr>");
                          }
                          
                          item.appendTo($("#outputList"));
                     });
            },
            error: function(result) {
                    if ( !_.isUndefined(result.responseJSON) ) {
                        $("<tr><td>" + result.responseJSON.message + "</td></tr>").appendTo($("#outputList"));
                    }
            }
    });
}

$(document).ready(function(){
      addDateType();
      addDateTimeType();
      addTimeType();
      addCustomTextArea();

      window.editor = CodeMirror.fromTextArea(document.getElementById("js_editor"), {
          styleActiveLine: true,
          matchBrackets: true,
          lineNumbers: false,
          theme: "monokai",
          mode: "javascript"
      });

      $(".tab-close").on("click", bindCloseTab);
      $("input[name=options_js_editor]").on("change",  toggleJsConsole);
      $("#execScript").on("click", execScript);
      $("#clearOutput").on("click", function(){ $("#outputList tr").remove(); });
});