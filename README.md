# README #

This project is developed by me(Swapnil Saxena) and my team-mates Ashish Chauhan, Pratham Pandey and Dikshant Gupta as a part of our 5th semester mini-project and is intended purely for educational purposes. Everyone is welcome to introduce changes, add features, fix bugs and distribute it without any consent.

### What is this repository for? ###

** Summary:** While working on large development projects, all software developers eventually find themselves in a position where working in groups appears to be more productive. With software projects involving a multitude of developers this almost becomes a crucial part of project development. A real time collaborative integrated development environment can provide developers with the facility to collaborate over software projects over a network even when developers are thousand of miles away. Real-time Collaborative IDE provide developers with the ability to collaboratively write code, build and test it as well as share their projects with other developers. Chatting with other fellow developers over a project is also possible. Besides several other useful features of a complete IDE including saving snapshots, project management are also provided to ease the entire project development process.

**Version:** 1.0
 
### How do I set up the client?  

* Set up a git account and fork the repository at 
https://dragonslayerx@bitbucket.org/dragonslayerx/collaborative-ide-client
* Clone the repository using git clone to have a local copy on your system.
* Once the cloning is complete, use NetBeans with jdk 1.8 or above to build the project. All the external libraries required for CollabIDE are already present in ./libs. Add them if needed.
* Modify files in ./config to change the server ip and listening port and also other desired settings for the client. By default the client tries to connect to localhost:3000.

### How do I set up the server?

* Set up a git account and fork the repository at https://dragonslayerx@bitbucket.org/dragonslayerx/collaborative-ide-server.
* Clone the repository using git clone to have a local copy on your system. 
* Install mongoDB to your system. Create a new database named 'CollabEdit'.
* Once done, execute mongod.exe present in INSTALL_LOC\MongoDB\Server\3.0\bin\
* Once the cloning is complete, use node.js terminal to execute /bin/www. The server is now up listening at port 3000 for http requests.

* Yipee... Done!!!. Introduce changes, add features, fix bugs and send a pull request to contribute. 

### Who do I talk to?

For any queries contact at:
* Swapnil Saxena (swapnilsaxena@live.in, swapniliiit@gmail.com)
