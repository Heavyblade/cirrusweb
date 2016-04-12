$(document).ready(function(){
  
    $("a[data-target=#myModal]").click(function(ev) {
        ev.preventDefault();
        var target = $(this).attr("href");
        // load the url and show modal on success
        $("#myModal .modal-body").load(target, function() { 
             $("#myModal").modal("show"); 
        });
    });
    
    
    $("#save_pedido").on("click", function(){
        var id = $("#id_pedido").attr("value");
        $.ajax({
            type: "PUT",
            url: ("/pedidos/" + id),
            data: $("#pedidos_form").serialize(),
            dataType: "json",
            success: function(data) {
                $("#myModal").modal("hide");
                window.location = window.location.pathname
            } 
        })
        return(false);
    });
    
    $(".delete_pedido").on("click", function(){
        var confirm = window.confirm("Estas seguro ?")
        if (confirm) {
            var url = $(this).attr("href")
            
            $.ajax({
                type: "DELETE",
                url: url,
                data: {},
                dataType: "json",
                success: function(data) {
                        window.location = window.location.pathname
                }
            })
        }
        return(false);
    });
})
