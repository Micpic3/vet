console.log('Loading function');

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

exports.handler = function(event, context, callback) {
    // console.log(event);

    // if (event.GET) {
    // console.log("This is a GET.");
    // 
    console.log("\nSANITY\n");

// for (var i = 0; i < 5; i++){
    let scanningParameters = {}
    scanningParameters = {
        TableName: 'vetconversationsinuse',
        Limit: 20
    };
    
    var key_to_delete = [];

    docClient.scan(scanningParameters, function(err, data) {
        if (err) {
            callback(err, null);
        }
        else {
            // console.log(data.Items)
            var i;
            for (i in data.Items) {
                var item = data.Items[i]
                // console.log(data.Items[i].convo_id)

                var params = {
                    TableName: "vetconversations",
                    Item: {
                        "convo_id": item.convo_id, //even
                        "labeler": "None",
                        "labels": item.labels,
                        "labeled": false,
                        "convo": item.convo
                    }
                };
                key_to_delete.push(item.convo_id);
                console.log("Adding: ", params.Item.convo_id)

                console.log("Attempting to move from inuse to regular")
                docClient.put(params, function(err, data2) {
                    if (err) {
                        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                        callback(err, null);
                    }
                    else {
                        console.log("I Done put it in ther.");

                        var params2 = {
                            TableName: "vetconversationsinuse",
                            Key: {
                                "convo_id": key_to_delete.pop()
                            }
                        };
                        
                        console.log("Deleting: ", params2.Key.convo_id)

                        console.log("Attempting a delete...");
                        docClient.delete(params2, function(err, data) {
                            if (err) {
                                console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                            }
                            else {
                                console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                            }
                        });
                    }
                });
            }
        }
    });
}
