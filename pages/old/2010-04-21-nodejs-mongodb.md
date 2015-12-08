# Хранилища данных в Node.js: MongoDB

MongoDB — документо-ориентированная база данных, нацеленная на удобную кластеризацию и написанная на C++. Сами разработчики утверждают, что она находится как раз посередине между key-value stores и традиционными реляционными БД. Я решил её покопать после того как увидел пост о создании блога на основе Express + MongoDB.

Документы в Mongo хранятся в виде JSON-подобных объектов, так что в JavaScript с ними работать довольно удобно. Кстати, для предварительного изучения MongoDB есть вот такая [интерактивная веб-консоль](http://try.mongodb.org) со встроенным tutorial.

## Установка

Выбираем версию на [странице релизов](http://www.mongodb.org/display/DOCS/Downloads), качаем wget'ом и распаковываем:

```
wget http://downloads.mongodb.org/linux/mongodb-linux-i686-1.4.1.tgz
tar -xvzf mongodb-linux-i686-1.4.1.tgz
```

Создадим каталог для хранения файлов баз MongoDB:

```
mkdir ~/mongo-data
```

Теперь запускаем

```
cd mongodb-linux-i686-1.4.1/bin
./mongod --dbpath ~/mongo-data/ &
```

Сервер должен запуститься в виде фонового процесса и сразу предупредить нас что размер базы данных ограничен двумя гигабайтами (если Вы используете 32-хбитную сборку). Чтобы проверить его работу, сразу к нему подключимся:

```
./mongo
```

Должна открыться консоль MongoDB. Можно например набрать show dbs и увидеть список доступных баз.

По умолчанию MongoDB не запускается вместе с системой, если Вам это нужно, добавьте её самостоятельно в init.d. Я рассчитываю просто поизучать, поэтому пока этим заниматься не буду.

В качестве коннектора воспользуемся [node-mongodb-native от christkv](http://github.com/christkv/node-mongodb-native/). Забираем архив последней версии со страницы загрузок:

```
wget http://github.com/christkv/node-mongodb-native/tarball/V0.7.1
tar -xvzf christkv-node-mongodb-native-V0.7.1-0-g08527ba.tar.gz
mv christkv-node-mongodb-native-V0.7.1-0-g08527ba node-mongodb-native-V0.7.1
```

Папку с коннектором я переименовал исключительно для удобства использования. В папке будет Makefile, но он используется только для запуска тестов. Нас же интересует сам коннектор — он лежит в lib/mongodb.

## Использование

 В принципе к коннектору прилагается директория examples, содержащая аж 11 примеров работы с MongoDB, причём довольно интересных. Я тут приведу только самые базовые операции.

Открытие базы данных:

```javascript

sys = require("sys");
test = require("mjsunit");
 
var mongo = require('../lib/mongodb');
 
// Хост и порт берутся из переменных окружения
var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : mongo.Connection.DEFAULT_PORT;
 
sys.puts("Connecting to " + host + ":" + port);
var db = new mongo.Db('node-mongo-examples', new mongo.Server(host, port, {}), {});
db.open(function(err, db) {
    // Подключились к базе
});
```

Создание коллекции и добавление элементов:

```javascript
// Открываем коллекцию. Если её не существует, она будет создана
  db.collection('test', function(err, collection) {
    // Добавляем три элемента
    for(var i = 0; i < 3; i++) {
      collection.insert({'a':i});
    }
  });
```

Показ элементов из коллеции:

```javascript
collection.count(function(err, count) {
      sys.puts("There are " + count + " records in the test collection. Here they are:");
 
      // Получаем все элементы коллекции с помощью find()
      collection.find(function(err, cursor) {
        cursor.each(function(err, item) {
 
          // Null обозначает последний элемент
          if (item != null) {
            sys.puts(sys.inspect(item));
          } else {
            sys.puts("That's all!");
          }
        });
      });
    });
```

В MongoDB проходить по элементам коллекции можно с помощью итератора, необязательно доставать элементы по одному, как это приходится делать в CouchDB.

Курсор нужен для того чтобы запрашивать объекты из MongoDB по мере необходимости. Т.е., новый документ будет получен только после того как будет вызван each()/nextObject()/toArray().

Можно также производить поиск по коллекции, доставая только элементы с нужными свойствами:

```javascript
 db.collection('test', function(err, collection) {
      collection.insert({'name':'Robert', 'age': 12});
      collection.insert({'name':'Agatha', 'age': 20});
      collection.insert({'name':'Sam', 'age': 6});
 
      // Получаем все элементы с age = 6
      collection.find({'age': 6}, function(err, cursor) {
 
        // Преобразовываем их в массив
        cursor.toArray(function(err, items) {
            // items - массив документов с age = 6
        });
      });
  });
```

Удаление документов из коллекции:

```javascript
db.collection('test', function(err, collection) {
    // Удаляем элементы с age = 20
    collection.remove({'age': 20}, function(err, collection) {
 
        // Удаляем все элементы
        collection.remove(function(err, collection) {
            // Все элементы удалены
        });
 
    })
  });
```

При сохранении документа в MongoDB ему назначается _id, как и в CouchDB. Но в отличии от Couch, в Mongo удобнее оперировать документами с помощью свойств.

Кроме этого, в MongoDB есть много других интересных вещей: хранение двоичных файлов, ссылки на документы в других коллекциях (примерный аналог — foreign key в SQL, насколько я понял), поддержка индексов, атомарное увеличение/уменьшение свойств и т.д.. MongoDB выглядит очень удобной базой данных для приложений разной сложности. Полагаю, следующее мини-приложение я напишу именно с её помощью, чтобы лучше освоиться с базой.

Источник: [Механический мир](http://kuroikaze85.wordpress.com/2010/04/21/node-js-mongodb/)