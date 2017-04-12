# license-checker
Java license checker



### Run local service (for development)

Run with simple filesystem cache : `npm start -- --cache=nedb`
Run with outgoing requests to external APIs logged: `npm start -- --cache=nedb --debug-request=debug`

Served at `localhost:3000`. Serve at different port: `PORT=3001 npm start -- --cache=nedb`



### Build docker image

No special options for build:

```
$ cd ./docker
$ docker build -t my_dockerimage:version .`
```



### Run prodlike dockerized service

##### 1.
Run regular postgres image with some name (in this example `postgres-lc`) and environment variable `POSTGRES_PASSWORD` set:

```
$ docker pull postgres:9.6.2
$ docker run --name postgres-lc -e POSTGRES_PASSWORD=MYPASSWORD -d postgres:9.6.2
```
Please make up some secure password!

##### 2.
Run license-checker docker image with linked postgres container and port mapping:

```
$ docker run -p 3000:3000 --link postgres-lc:postgres my_dockerimage:version
```

Additional server args can go in the end, like:

```
$ docker run -p 3000:3000 --link postgres-lc:postgres my_dockerimage:version --debug-request=info
```

