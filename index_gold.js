//import module
var restify = require("restify");
var builder = require("botbuilder");
var request = require("request");

//Setup Web Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || "3978", function () {
    console.log('%s listening to %s', server.name, server.url);
});

//create chat connector for communicating with the bot framework service

var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
});

//Listen for messages from users
server.post('/api/messages', connector.listen());

// create your bot with a function to receive messages from user
// 歡迎訊息頁
var bot = new builder.UniversalBot(connector,
    function (session) {
        session.send('歡迎來到FinTastic');
        session.replaceDialog('mainMenu')
    });

bot.dialog('mainMenu', [
    function (session) {
        builder.Prompts.choice(session, "請問要查詢什麼?", ["美股", "匯率", "台股", "港股", "日股", "金屬"], { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.ask = results.response.entity;
        if (session.dialogData.ask == "美股")
            session.replaceDialog('us');
        else if (session.dialogData.ask == "金屬")
            session.beginDialog('metal');
        // TODO 加入每個人寫的功能
    }
]).triggerAction({ matches: /^回首頁$/ }); //使用者任何時間打入"回首頁"都可以回到首頁

bot.dialog('us', [
    function (session) {
        builder.Prompts.text(session, "請輸入美股Ticker:");

        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        var id = results.response;
        var options = {
            method: "GET",
            url: "https://www.alphavantage.co/query",
            //寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs: {
                function: "TIME_SERIES_DAILY",
                symbol: id,
                apikey: "2C8MUXABNVMED4DS"
            },
            //指定json格式的輸出
            json: true
        }
        request(options, function (error, response, body) {
            var stock = body;
            if (stock["Time Series (Daily)"]) {
                //用RegExpression, 找出JSON檔第一筆日期的資料，可以避免節慶日找不到資料
                var date = JSON.stringify(stock["Time Series (Daily)"]).match(/\d{4}-\d{2}-\d{2}/);
                //parseFloat 將文字改成Float type, toFixed(2)將數字縮到小數點2位數
                var open = parseFloat(stock["Time Series (Daily)"][date]["1. open"]).toFixed(2)
                var high = parseFloat(stock["Time Series (Daily)"][date]["2. high"]).toFixed(2)
                var low = parseFloat(stock["Time Series (Daily)"][date]["3. low"]).toFixed(2)
                var close = parseFloat(stock["Time Series (Daily)"][date]["4. close"]).toFixed(2)
                session.send(`${id.toUpperCase()} : ${date} \nopen $${open}\nhigh $${high}\nlow $${low}\nclose $${close}`);
                session.replaceDialog('us');
            } else {
                session.send(`沒有找到這個股票!`);
                session.replaceDialog('us');
            }
        });
    }
])


bot.dialog('metal', [
    function (session) {
        builder.Prompts.choice(session, "請選擇您想知道的金屬？", "黃金|白銀|鋅|鋁|銅", { listStyle: builder.ListStyle.button });
        
        // TODO 提供一個trigger event, 讓使用者可以回到首頁選單
        //=======================回首頁按鈕===========================
        var msg = new builder.Message(session);
        msg.suggestedActions(builder.SuggestedActions.create(
            session, [
                builder.CardAction.imBack(session, "回首頁", "回首頁"),
                builder.CardAction.imBack(session, "我的最愛", "我的最愛"),
                builder.CardAction.imBack(session, "新增最愛", "新增最愛"),
                builder.CardAction.imBack(session, "刪除最愛", "刪除最愛")
            ]
        ));
        session.send(msg);
        // ==========================================================
    },
    function (session, results) {
        session.dialogData.expensive = results.response.entity;
        if(session.dialogData.expensive == "黃金") {
            var options = {
            method: "GET",
            url: "https://www.quandl.com/api/v3/datasets/CME/GCZ2018.json?",
            // 寫在api url ?後面的參數，要放在qs(key)的Json set內
            qs:{
                api_key:"sae2Txxu_kQTHFHDxyjr"
            }, 
            // 指定json格式的輸出
            json: true
            }
            request(options, function (error, response, body) {
                var gold = body;
                // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
                // var getDate = JSON.stringify(gold["dataset"]["data"][0]).match(/\d{4}-\d{2}-\d{2}/);
                var getDate = gold["dataset"]["data"][0][0];
                var getgold = gold["dataset"]["data"][0][4];
                session.endDialog(`${getDate}黃金close at : $${getgold}`);
                session.replaceDialog('metal');
                // TODO 讓request資料已經完成後，才執行session.replaceDialog
            });            
        } else if (session.dialogData.expensive == "白銀") {
            var options = {
                method: "GET",
                url: "https://www.quandl.com/api/v3/datasets/CHRIS/CME_SI1.json?",
                // 寫在api url ?後面的參數，要放在qs(key)的Json set內
                qs:{
                    api_key:"sae2Txxu_kQTHFHDxyjr"
                }, 
                // 指定json格式的輸出
                json: true
                }
                request(options, function (error, response, body) {
                    var gold = body;            
                    // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料    
                    var getDate = gold["dataset"]["data"][0][0];
                    var getgold = gold["dataset"]["data"][0][4];
                    session.endDialog(`${getDate} \n白銀close at : $${getgold}`);
                    session.replaceDialog('metal');
                    // TODO 讓request資料已經完成後，才執行session.replaceDialog     
                });                           
        } else if (session.dialogData.expensive == "鋅") {
            var options = {
                method: "GET",
                url: "https://www.quandl.com/api/v3/datasets/LME/AB_ZI.json?",
                // 寫在api url ?後面的參數，要放在qs(key)的Json set內
                qs:{
                    api_key:"sae2Txxu_kQTHFHDxyjr"
                }, 
                // 指定json格式的輸出
                json: true
                }
                request(options, function (error, response, body) {
                    var gold = body;                  
                    // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料    
                    var getDate = gold["dataset"]["data"][0][0]; 
                    var getgold = gold["dataset"]["data"][0][1];
                    session.endDialog(`價格描述：Prices in US$ per tonne \n ${getDate} \n鋅close at : $${getgold}`);
                    session.replaceDialog('metal');
                    // TODO 讓request資料已經完成後，才執行session.replaceDialog
                });
                
        } else if (session.dialogData.expensive == "鋁") {
            var options = {
                method: "GET",
                url: "https://www.quandl.com/api/v3/datasets/LME/AB_AL.json?",
                // 寫在api url ?後面的參數，要放在qs(key)的Json set內
                qs:{
                    api_key:"sae2Txxu_kQTHFHDxyjr"
                }, 
                // 指定json格式的輸出
                json: true
                }
                request(options, function (error, response, body) {
                    var gold = body;                    
                    // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料
                    var getDate = gold["dataset"]["data"][0][0]; 
                    var getgold = gold["dataset"]["data"][0][1];
                    session.endDialog(`價格描述：Prices in US$ per tonne \n ${getDate} \n鋁close at : $${getgold}`);
                    session.replaceDialog('metal');
                    // TODO 讓request資料已經完成後，才執行session.replaceDialog
                });                
        } else if (session.dialogData.expensive == "銅") {
            var options = {
                method: "GET",
                url: "https://www.quandl.com/api/v3/datasets/LME/AB_CU.json?",
                // 寫在api url ?後面的參數，要放在qs(key)的Json set內
                qs:{
                    api_key:"sae2Txxu_kQTHFHDxyjr"
                }, 
                // 指定json格式的輸出
                json: true
                }
                request(options, function (error, response, body) {
                    var gold = body;
                    // TODO:用RegExpression,找出JSON檔第一筆日期的資料,可以避免節慶日找不到資料    
                    var getDate = gold["dataset"]["data"][0][0];  
                    var getgold = gold["dataset"]["data"][0][1];                    
                    session.endDialog(`價格描述：Prices in US$ per tonne \n ${getDate} \n銅 close at : $${getgold}`);
                    session.replaceDialog('metal');
                    // TODO 讓request資料已經完成後，才執行session.replaceDialog
                });
        }      
        // session.replaceDialog('metal');
        // TODO 讓request資料已經完成後，才執行session.replaceDialog
    }
]);

