function base64(s) { return window.btoa(unescape(encodeURIComponent(s))); }

function writeFile(fullTemplate, filename) {
    // If Internet Explorer
    if (typeof msie !== "undefined" && msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
        if (typeof Blob !== "undefined") {
            // use blobs if we can
            fullTemplate = [fullTemplate];
            // convert to array
            var blob1 = new Blob(fullTemplate, { type: "text/html" });
            window.navigator.msSaveBlob(blob1, filename );
        } else {
            // otherwise use the iframe and save
            // requires a blank iframe on page called txtArea1
            txtArea1.document.open("text/html", "replace");
            txtArea1.document.write(fullTemplate);
            txtArea1.document.close();
            txtArea1.focus();
            sa = txtArea1.document.execCommand("SaveAs", true, filename );
        }
    } else {
        link = "data:application/vnd.ms-excel;base64," + base64(fullTemplate);
        a = document.createElement("a");
        a.download = filename;
        a.href = link;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

function excelType(value) {
    if (typeof(value) == "string") {return("String");}
    if (typeof(value) == "number") {return("Number");}
    return("String");
}

function GenerateColumnNames(dataFields) {    
    var names = _.chain(dataFields)
                 .map(function(field) { return(field.title); })
                 .compact()
                 .map(function(name) { return("<Cell><Data ss:Type='String'>" + name +  "</Data></Cell>"); })
                 .reduce(function(row, cell) { return(row + cell); }, "")
                 .value();
    return("<Row>" + names  + "</Row>")
}

function GenerateRows(list) {
    var values,
        filas = _.map(list, function(item) {
                    values = _.values(item);
                    return("<Row>" + _.map(values, function(value){ return(buildCell(value)); }).join("") + "</Row>");
                });

    return(filas.join(""));
}

function buildCell(name) {
    return("<Cell><Data ss:Type='" + excelType(name) + "'>" + name + "</Data></Cell>");
}

function genExcelDocument(data, fields) {
  var doc = [ "<?xml version='1.0' encoding='UTF-8'?>",
          	  "<Workbook xmlns='urn:schemas-microsoft-com:office:spreadsheet' xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:x='urn:schemas-microsoft-com:office:excel' xmlns:ss='urn:schemas-microsoft-com:office:spreadsheet' xmlns:html='http://www.w3.org/TR/REC-html40'>",
          	  "<Worksheet ss:Name='Hoja1'><Table>",
              GenerateColumnNames(fields),
              GenerateRows(data),
          	  "</Table></Worksheet>",
          	  "</Workbook>"];
	return(doc.join(""));
}

function genExcel(id, filename) {
    var filename = filename || prompt("Nombre para el archivo?");
    if ( filename ) {
        writeFile(genExcelDocument($(id).jsGrid("option", "data"), $(id).jsGrid("option", "fields")), filename);
    }
}