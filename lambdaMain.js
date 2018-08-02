console.log('Loading function');

const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' });

exports.handler = function(event, context, callback) {
    console.log(event);

    if (event.GET) {
        console.log("This is a GET.");

        let scanningParameters = {}
        scanningParameters = {
            TableName: 'vetconversations',
            Limit: 1
        };

        docClient.scan(scanningParameters, function(err, data) {
            if (err) {
                callback(err, null);
            }
            else {

                var userparams = {
                    TableName: "vetusercount",
                    "ConsistentRead": true,
                    "AttributesToGet": ["count"],
                    Key: {
                        "username": event.labeler
                    }
                };

                var usercount = 0

                docClient.get(userparams, function(err, data2) {

                    if (err) {
                        console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
                    }
                    else {

                        console.log("Just got user count.")

                        if (data2.Item == null) {
                            usercount = 0;

                            var newuserparams = {

                                TableName: "vetusercount",
                                Item: {
                                    "username": event.labeler,
                                    "count": 0
                                }
                            };
                            console.log("Adding new user.");
                            docClient.put(newuserparams, function(err, data) {
                                if (err) {
                                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                                    callback(err, null);
                                }
                                else {
                                    console.log("Added new user:", event.labeler);
                                }
                            });

                            usercount = 0;

                        }
                        else {
                            usercount = data2.Item.count;
                        }
                    }
                    console.log("Usercount: ", usercount)

                    data.Items[0].count = usercount;
                    console.log(data.Items);
                    callback(null, data.Items[0]);

                });

                if (data.Count >= 1) {

                    var params = {
                        TableName: "vetconversationsinuse",
                        Item: {
                            "convo_id": parseInt(data.Items[0].convo_id), //even
                            "labeler": event.labeler,
                            "labels": data.Items[0].labels,
                            "labeled": false,
                            "convo": data.Items[0].convo
                        }
                    };

                    var convo_id_to_delete = data.Items[0].convo_id

                    docClient.put(params, function(err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                            callback(err, null);
                        }
                        else {
                            console.log("Added item:", JSON.stringify(data, null, 2));


                            var params = {
                                TableName: "vetconversations",
                                Key: {
                                    "convo_id": convo_id_to_delete
                                }
                            };

                            console.log("Attempting a delete...");
                            docClient.delete(params, function(err, data) {
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
                else {

                    var end = {};
                    end.labels = [];
                    end.labels[0] = "DONE";
                    end.count = usercount;
                    callback(null, end);

                }
            }

        });
    }
    else {
        console.log("This is a POST.")

        if (event.review) {
            console.log("Requested for review.")


            // console.log("Defined convo_id");

            if (isNaN(parseInt(event.convo_id))) {
                var end = {}
                end.convo = "Not a valid convo_id."
                callback(null, end);
            }
            else {

                var params = {
                    TableName: "vetconversationslabeled",
                    Key: {
                        "convo_id": parseInt(event.convo_id)
                    }
                };

                docClient.get(params, function(err, data) {

                    if (err) {
                        console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
                    }
                    else {

                        if (data.Item == null) {
                            var end = {}
                            end.convo = "No convo with that id. Please refresh."
                            callback(null, end);
                        }
                        else {
                            console.log("Item:");
                            console.log(data.Item);
                            callback(null, data.Item);
                        }
                    }
                });
            }

        }
        else {
            var params = {

                TableName: "vetconversationslabeled",
                Item: {
                    "convo_id": parseInt(event.convo_id), //even
                    "labeler": event.labeler,
                    "labels": event.labels,
                    "labeled": true,
                    "convo": event.convo
                }
            };

            console.log("Adding a new item...");
            docClient.put(params, function(err, data) {
                if (err) {
                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                    callback(err, null);
                }
                else {
                    console.log("Added item:", JSON.stringify(data, null, 2));


                    var userparams = {
                        TableName: "vetusercount",
                        "ConsistentRead": true,
                        "AttributesToGet": ["count"],
                        Key: {
                            "username": event.labeler
                        }
                    };
                    console.log("Get user count: ", event.labeler);
                    docClient.get(userparams, function(err, data) {

                        if (err) {
                            console.error("Unable to get item. Error JSON:", JSON.stringify(err, null, 2));
                        }
                        else {

                            console.log("Just got user count.")

                            if (data.Item == null) {

                                var newuserparams = {

                                    TableName: "vetusercount",
                                    Item: {
                                        "username": event.labeler,
                                        "count": 1
                                    }
                                };
                                console.log("Adding new user.");
                                docClient.put(newuserparams, function(err, data) {
                                    if (err) {
                                        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                                        callback(err, null);
                                    }
                                    else {
                                        console.log("Added new user:", event.labeler);
                                    }
                                });

                            }
                            else {

                                var updatecountparams = {
                                    TableName: "vetusercount",
                                    Item: {
                                        "username": event.labeler,
                                        "count": data.Item.count + 1
                                    }
                                };
                                console.log("Updating user count from:", data.Item.count)

                                docClient.put(updatecountparams, function(err, data) {
                                    if (err) {
                                        console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                                        callback(err, null);
                                    }
                                    else {
                                        console.log("Updated user:", event.labeler);
                                    }
                                });

                            }
                        }
                    });

                    var params = {
                        TableName: "vetconversationsinuse",
                        Key: {
                            "convo_id": event.convo_id
                        }
                    };

                    console.log("Attempting a delete...");
                    docClient.delete(params, function(err, data) {
                        if (err) {
                            console.error("Unable to delete item. Error JSON:", JSON.stringify(err, null, 2));
                        }
                        else {
                            console.log("DeleteItem succeeded:", JSON.stringify(data, null, 2));
                        }
                    });

                    callback(null, null);
                }
            });

        }
    }
}
