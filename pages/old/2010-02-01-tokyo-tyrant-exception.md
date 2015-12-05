# Tokyo Tyrant — Exception: connection is not open

На деле же соединение с Tyrant закрывается само по себе в течении примерно пяти-семи минут. Скорее всего дело в режиме соединения. Я пока не очень разобрался в протоколе TT, но например в Sphinx, протокол которого я реализовывал в limestone, есть два режима подключения — обычный и persistent connection. Возможно в Tokyo Tyrant есть такая же опция.

Пока же самым простым способом пофиксить соединения было открывать их при каждом запросе:

```javascript
var hello = [
    ["/", function(req, res) {
        var page_text = '';
 
        tyrant.connect();
        tyrant.addListener('connect', function() {
 
            /* Получение и вывод записей в блоге */
            tyrant.quit();
 
        });
    }],
    ["/write", function(req, res) {
 
        /* Форма для добавления новой записи */
 
    }],
 
    [post('/save'), function(req, res) {
 
        // Save post to Tyrant
        getPostParams(req, function(data) {
            tyrant.connect();
            tyrant.addListener('connect', function() {
 
                /* Сохранение полученной записи в Tyrant */
                tyrant.quit();
 
            });
        });
 
    }],
];
 
server = nerve.create(hello);
server.serve();
```

Понятно что для обмена данными с пользователем этот способ не годится. Но теоретически на него можно наткнуться если открыть соединение с TT и ждать конца длительной операции (например, перекодирование видео).

Кстати, статья по Redis похоже откладывается. После Tokyo Tyrant будет описан [CouchDB](http://couchdb.apache.org/).

Источник: [http://kuroikaze85.wordpress.com/2010/01/29/tokyo-tyrant-exception-connection-is-not-open/](http://kuroikaze85.wordpress.com/2010/01/29/tokyo-tyrant-exception-connection-is-not-open/)
