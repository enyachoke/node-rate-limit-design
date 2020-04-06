### Prerequisites
[Docker](https://docs.docker.com/install/)
[Docker Compose](https://docs.docker.com/compose/install/)
[Nodejs](https://nodejs.org/en/)
### Usage
Building an images
```$ docker-compose build```
Running containers
```$ docker-compose up```
Test with browser
http://localhost:8080/hello
Test with Normall load
```$ bash stress.sh 2 http://localhost:8080/hello```
Simulate Abuse
```$ bash stress.sh 8 http://localhost:8080/hello```
Stop the containers and reset
```$ docker-compose down```
