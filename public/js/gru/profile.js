(function (L) {
    var _this = null;
    L.Profile = L.Profile || {};
    _this = L.Profile = {
        data: {
            myId: 0,
            myName: "",
            myUserName: "",
            myself:{},
            users: [],
            groups: [],
            userMap: {},
            groupMap: {},
            groupIds: "",
            socket: null,
            url: ""
        },
        init: function () {
            $.ajax({
                type: "GET",
                url: "/profile/getMetaData",
                data: {},
                success: function (result) {
                    if (result.success) {
                        _this.data.myId = result.data.myId;
                        _this.data.myName = result.data.myName;
                        _this.data.myUserName = result.data.myUserName;
                        _this.data.myself = result.data.userMap[result.data.myId];
                        _this.data.users = result.data.users;
                        _this.data.groups = result.data.groups;
                        _this.data.userMap = result.data.userMap;
                        _this.data.groupMap = result.data.groupMap;
                        _this.data.groupIds = result.data.groupIds;
                        _this.data.url = result.data.url;

                        var tpl = $("#chat-tpl").html();

                        for (var i in _this.data.users) {
                            var u = _this.data.users[i];
                            var data = {
                                chatType: 'user',
                                chatWithId: u.id,
                                showName: u.name
                            };
                            var html = juicer(tpl, data);
                            $("#right-content").append(html);
                        }

                        for (var j in _this.data.groups) {
                            var g = _this.data.groups[j];
                            var data = {
                                chatType: 'group',
                                chatWithId: g.id,
                                showName: g.name
                            };
                            var html = juicer(tpl, data);
                            $("#right-content").append(html);
                        }


                        _this.initConnect(result.data.url);
                        _this.initEvent();
                    } else {
                        _this.showTipDialog("Warn", "Can not get users and groups!");
                    }
                },
                error: function () {
                }
            });
        },

        updateStatus: function (text) {
            $("#chat-with-name").text(text);
        },

        initConnect: function (url) {
            _this.updateStatus("Connect to " + url);

            $.ajax({//生成token
                url: '/profile/genToken/',
                type: 'get',
                data: {},
                dataType: 'json',
                success: function (result) {
                    //console.dir(result);
                    if (result.success) {
                        token1 = result.token1;
                        token2 = result.token2;
                        _this.data.socket = io.connect(url, {
                            "reconnect": true,
                            "auto connect": true,
                            "force new connection": true
                        });

                        _this.initSocket(_this.data.socket);
                    }
                },
                error: function () {
                    _this.updateStatus("Connect to " + url + " error");
                }
            });
        },

        initSocket: function (socket) {
            socket.on("connect_error", function (error) {
                console.error(error);
            });

            socket.on('connect', function () {
                _this.updateStatus("Connect ok.");
                socket.emit('auth', JSON.stringify({
                    id: _this.data.myId,
                    name: _this.data.myName,
                    token1: token1,
                    token2: token2
                }));
            });

            socket.on('auth_result', function (data) {
                _this.updateStatus('Auth ok.');

                if (_this.data.groups.length > 0) {
                    socket.emit('subscribe', JSON.stringify({
                        userId: _this.data.myId,
                        subscribeGroups: _this.data.groups
                    }));
                }

            });

            //订阅群组的回调
            socket.on('subscribe_result', function (data) {
                console.log("订阅结果", data);
                _this.updateStatus("Subscribe ok.");
            });

            //获取到的在线人
            socket.on('online_result', function (data) {
                _this.updateStatus("在线人：" + JSON.stringify(data));
            });

            socket.on('fileDownload',function(data){
               console.log(data)
                var content = data.content;
                var filename = data.filename;
                var contentType = data.msgContentType;
                var fromUser = _this.data.userMap[fromUserId];

                //保存文件
            });
            //接收消息的监听方法
            socket.on('msg', function (msg) {
                //{"id":0,"createTime":1445676988148,"fromId":984,"msgType":0,"target":{"id":"984","type":-1},"content":"this is a message__1","expireTime":0}
                //{"id":0,"createTime":1445676996823,"fromId":984,"msgType":1,"target":{"id":"10","type":-1},"content":"this is a message__1__2","expireTime":0}

                console.log(msg);
                var data = {};
                try {
                    if (msg.msgType == 0) {//来自私人的消息
                        var fromUserId = msg.fromId;
                        var content = msg.content;
                        var filename = msg.filename;
                        var contentType = msg.msgContentType;
                        var fromUser = _this.data.userMap[fromUserId];

                        if (fromUser && msg.target.id == _this.data.myId) {//用户确实存在,并且是发给我的消息

                            if($("#chat-window-user-" + fromUserId).css("display")=="none"){//如果聊天窗体没有打开，则标记上新消息提醒的小红点
                                $("#new-msg-user-" + fromUserId).css("display","inline-block");
                            }



                            if (fromUserId == _this.data.myId) {//说明是自己的消息，应该置于右边
                                _this.showUserMsg("right", msg.createTime, fromUser, content);
                            } else {
                                _this.showUserMsg("left", msg.createTime, fromUser, content);
                            }


                        }

                    } else if (msg.msgType == 1) {//来自群组的消息
                        var fromUserId = msg.fromId;
                        var toGroupId = msg.target.id;
                        var content = msg.content;
                        var fromUser = _this.data.userMap[fromUserId];
                        var fromGroup = _this.data.groupMap[toGroupId];

                        if (fromUser && fromGroup) {//用户确实存在，群组也存在
                            if($("#chat-window-group-" + toGroupId).css("display")=="none"){//如果聊天窗体没有打开，则标记上新消息提醒的小红点
                                $("#new-msg-group-" + toGroupId).css("display","inline-block");
                            }


                            if (fromUserId == _this.data.myId) {//说明是自己的消息，应该置于右边
                                _this.showGroupMsg("right", msg.createTime, fromUser, fromGroup, content);
                            } else {
                                _this.showGroupMsg("left", msg.createTime, fromUser, fromGroup, content);
                            }
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            });

            socket.on('disconnect', function () {
                _this.updateStatus("Connect failed.");
            });
        },

        showUserSelfMsg: function (position, createTime, fromUser, toUserId, content) {
            var tpl;
            if (position == 'right') {
                tpl = $("#chat-msg-right-tpl").html();
            } else {
                tpl = $("#chat-msg-left-tpl").html();
            }

            var data = {
                user: fromUser,
                time: _this.formatDate(new Date(createTime)),
                content: content
            };

            var html = juicer(tpl, data);
            $("#chat-window-user-" + toUserId + " .direct-chat-messages").append(html);

            _this.scroolToBottom("user", toUserId);//滚到底部

            var msgCount = $("#chat-window-user-" + toUserId + " .direct-chat-messages .direct-chat-msg").length;
            $("#chat-window-user-" + toUserId + " .box-tools .badge").text(msgCount);
        },

        showUserMsg: function (position, createTime, fromUser, content) {
            var tpl;
            if (position == 'right') {
                tpl = $("#chat-msg-right-tpl").html();
            } else {
                tpl = $("#chat-msg-left-tpl").html();
            }

            var data = {
                user: fromUser,
                time: _this.formatDate(new Date(createTime)),
                content: content
            };

            var html = juicer(tpl, data);
            $("#chat-window-user-" + fromUser.id + " .direct-chat-messages").append(html);

            _this.scroolToBottom("user", fromUser.id);//滚到底部

            var msgCount = $("#chat-window-user-" + fromUser.id + " .direct-chat-messages .direct-chat-msg").length;
            $("#chat-window-user-" + fromUser.id + " .box-tools .badge").text(msgCount);
        },


        showGroupMsg: function (position, createTime, fromUser, fromGroup, content) {
            var tpl;
            if (position == 'right') {
                tpl = $("#chat-msg-right-tpl").html();
            } else {
                tpl = $("#chat-msg-left-tpl").html();
            }

            var data = {
                user: fromUser,
                time: _this.formatDate(new Date(createTime)),
                content: content
            };

            var html = juicer(tpl, data);
            $("#chat-window-group-" + fromGroup.id + " .direct-chat-messages").append(html);


            _this.scroolToBottom("group", fromGroup.id);//滚到底部

            var msgCount = $("#chat-window-group-" + fromGroup.id + " .direct-chat-messages .direct-chat-msg").length;
            $("#chat-window-group-" + fromGroup.id + " .box-tools .badge").text(msgCount);

        },

        initEvent: function () {
            $("body").on("click", "a.chat-user", function () {
                var chatUserId = $(this).attr("data-id");
                var chatUserName = $(this).attr("data-name");
                $("#chat-with-name").text(chatUserName);

                $("#right-content .row").each(function () {
                    $(this).hide();
                });

                $("#new-msg-user-" + chatUserId).hide();
                $("#chat-window-user-" + chatUserId).show();

            });

            $("body").on("click", "a.chat-group", function () {
                var chatGroupId = $(this).attr("data-id");
                var chatGroupName = $(this).attr("data-name");
                $("#chat-with-name").text(chatGroupName);

                $("#right-content .row").each(function () {
                    $(this).hide();
                });

                $("#new-msg-group-" + chatGroupId).hide();

                $("#chat-window-group-" + chatGroupId).show();

            });

            $("body").on("click", ".send-msg-btn", function () {
                var toId = $(this).parent().parent().parent().attr("data-id");
                var toType = $(this).parent().parent().parent().attr("data-type");
                var content = $(this).parent().parent().find("input").val();
                console.log(toId, toType, content);

                if(!content || !toId || !toType){
                    return;
                }

                $(this).parent().parent().find("input").val("");

                if (toType == "group") {
                    _this.sendBroadcastMessage(toId, content);
                } else if (toType == "user") {
                    _this.sendUnicastMessage(toId, content);
                }

            });

            $("body").on("click", ".upload-file-btn", function () {
                // 上传文件
                var toId = $(this).parent().parent().parent().attr("data-id");
                var toType = $(this).parent().parent().parent().attr("data-type");
                var fileObj = $(this).parent().parent().find("input").get(0).files[0];
                var filename = fileObj.name

                console.log(toId, toType, filename);

                if(!fileObj || !toId || !toType){
                    return;
                }

                if (filename != "") {
                    try {
                        var obj = new ActiveXObject("ADODB.Stream");//这个必然是IE
                    }
                    catch (e) {
                        var reader = new FileReader();
                        reader.readAsArrayBuffer(fileObj);//生成ArrayBuffer格式
                        reader.onloadend = function () {
                            // 这个事件在读取结束后，无论成功或者失败都会触发
                            if (reader.error) {
                                console.log(reader.error);
                            } else {
                                // console.log(reader.result)
                                var blob=new Blob([this.result])//socket默认二进制格式为blob,所以把ArrayBuffer转换为blob

                                if (toType == "group") {
                                    _this.sendFileToGroup(toId,filename, blob);
                                } else if (toType == "user") {
                                    _this.sendFileToUser(toId,filename, blob);
                                }

                            }
                        }
                        return;
                    }
                }
            });
        },

        sendBroadcastMessage: function (toId, content) {
            var msg = {
                contentType:0,
                type: 1, //1 广播，0 单播给指定target
                target: {
                    id: toId
                },
                content: content
            };

            _this.data.socket.emit('msg', JSON.stringify(msg));
        },

        sendUnicastMessage: function (toId, content) {

            var msg = {
                contentType:0,
                type: 0, //1 广播，0 单播给指定target
                target: {
                    id:toId
                },
                content: content
            };

            _this.showUserSelfMsg("right", new Date().getTime(),_this.data.myself, toId, content );

            _this.data.socket.emit('msg', JSON.stringify(msg));
        },

        //向socket上传文件
        sendFileToUser: function (toId, filename, blob) {
            var msg = {
                contentType:1,
                type: 0, //1 广播，0 单播给指定target
                target: {
                    id:toId
                },
                filename:filename
            };

            _this.data.socket.emit('filemsg', JSON.stringify(msg),blob);
            _this.data.socket.emit('sendFileSummory',JSON.stringify(msg));
            alert('向后台发送二进制文件流')
        },

        //向socket上传语音消息
        sendVoiceToUser:function(toId, filename, blob){
          var msg = {
              contentType:2,
              type:0, //1 广播，0 单播给指定target
              target:{
                  id:toId
              },
              filename:null
          };

            _this.data.socket.emit('filemsg', JSON.stringify(msg),blob);
            alert('向后台发送语音消息')
        },

        sendFileToGroup: function (toId, filename, blob) {
            var msg = {
                contentType:1,
                type: 1, //1 广播，0 单播给指定target
                target: {
                    id:toId
                },
                filename:filename
            };

            _this.data.socket.emit('filemsg', JSON.stringify(msg),blob);
            _this.data.socket.emit('sendFileSummory',JSON.stringify(msg));
            alert('向后台发送二进制文件流')
        },

        showTipDialog: function (title, content) {
            if (!content) {
                content = title;
                title = "Tips";
            }
            var d = dialog({
                title: title || 'Tips',
                content: content,
                width: 350,
                cancel: false,
                ok: function () {
                }
            });
            d.show();
        },

        scroolToBottom: function(type, id){
            var scrollNode = $("#chat-window-"+type+"-" + id + " .direct-chat-messages")[0];
            scrollNode.scrollTop = scrollNode.scrollHeight;
        },

        formatDate: function (now) {
            var year = now.getFullYear();
            var month = now.getMonth() + 1;
            var date = now.getDate();
            var hour = now.getHours();
            var minute = now.getMinutes();
            var second = now.getSeconds();
            if (second < 10) second = "0" + second;
            return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
        }
    };
}(Gru));
