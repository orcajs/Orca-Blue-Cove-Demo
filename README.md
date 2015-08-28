ORCA "Blue Cove School" Demo
============================


# 1. Introduction

Orca.js is a JavaScript API for supporting Real Time Communications (RTC) in web applications. Orca.js abstracts the implementation of RTC from the application allowing application code to be portable across different RTC providers. For more information go to:

* http://www.orcajs.org
* https://github.com/orcajs/orca.js

This repository contains an application built to demonstrate the value of Orca.js. The application is presented as a web site for a fictional school "Blue Cove Elementary" which provides links to tutors for additional teaching. The demonstration shows two particular points:

* The value of adding Real Time Communication (RTC) to a web site
* The value of using the Orca.js API to decouple application code from the underlying RTC infrastructure

This project is for development, testing and experimentation purposes. The implementation, as provided here, is not intended to be used in any kind of real applications. It does not provide good support for security or robustness features that would be required in real deployments. By default STUN and TURN are not used and both endpoints must be on the same LAN segment to enable communication.

# 2. Configuring the demonstration

The demonstration may be configured to use one of two RTC providers (AKA "backend servers"). Note that the choice of backend server is a simple matter of selecting the appropriate transport library and providing the necessary configuration. The actual
application code (in this case in the file demo.js) is not modified. This illustrates the value for client developers of the decoupling from the particular infrastructure offered by Orca.

The two backend servers supported are the Orca Reflector and the Matrix system. For more details about these systems and Orca support see:

* https://github.com/orcajs/reflector
* https://github.com/orcajs/Orca-Matrix-Demo-Library

For either option start the initial configuration by downloading this repository on to your computer and arranging for the contents to be accessible on the web by using any common web server.

## 2.1. Configuring for the Orca Reflector

Download and install the Orca Reflector server following the instructions at https://github.com/orcajs/reflector

If you are going to run the reflector server and the demo web server on the same machine note that the reflector uses port 443 by default and this may cause a conflict with the web server. If desired edit the config.js file for the reflector to use a different port, eg 8443. Start the reflector server following the instructions at the link above.

From this demonstration repository edit the file "demo.js" and set the "sessionConfig" URI field to be the URI (including the port number) of the reflector server.

Edit the files "demo1.htm" and "demo2.htm" and uncomment the line indicated in the HEAD section needed to support the reflector. Ensure that the two alternative lines used for the Matrix backed in the HEAD section are still commented out.

If desired the hidden inputs in the "demo1.htm" and "demo2.htm" files can be edited to assign different usernames and passwords to access the reflector server. However, as the reflector server currently does not 
actually validate passwords the dummy values in the default versions of these files can be used unmodified.

Note the limitations of the reflector as explained at https://github.com/orcajs/reflector

## 2.2 Configuration for Matrix

Edit the files "demo1.htm" and "demo2.htm" and uncomment the two lines indicated in the HEAD section needed to support Matrix. Ensure that the alternative line used for the Reflector backed in the HEAD section is still commented out.

You will also need to configure the "demo1.htm" and "demo2.htm" files to use suitable Matrix identities. Refer to the README.md at https://github.com/orcajs/Orca-Matrix-Demo-Library for instructions on how to create the necessary Matrix identities and how to edit the hidden inputs in the "demo1.htm" and "demo2.htm" files.

Note the limitations of the demo quality Matrix interworking as explained at https://github.com/orcajs/Orca-Matrix-Demo-Library

# 3. Operation of the Demo

The demo consists of a "public" site which shows how a school web site may be presented to its users and a "private" site which is used as part of the demonstration. Ideally each site should be loaded on different computers
with the "public" site being visible during the demonstration and the "private" site being hidden.

This demo is tested on Chrome and it is recommended that this browser is used for the demo.

The front page of the public site is available as the default (index.html) at the hosted URL. The private site consists of one page which is "demo2.htm" at the hosted URL. To start the demo load both of these pages. The public site should be shown by the demonstrator. The private site should be used by someone playing the part of the tutor.

The story line for the demo is that a school provides a service where tutors can be requested for additional teaching. The front page of the public site shows the overview of the school's activities with
links to all the different information. For this demo we are interested in the tutors which can be accessed via the "staff directory". For this demo site a single path through the demo has been configured
therefore most of the links do not go to the subject stated but rather follow the path as described here. Clicking on the "staff directory" icon (or any other link) will open the "staff directory" page.

From the "staff directory" page there are two active links with similar functionality but different presentation. "Mrs Madison" provides a modern looking site. "Mrs Howe" provides a humorous, retro site. Clicking on either
of these links will enter a login page. This represents where parents would log in to the site to access information about their children. For the demo this login is not functional and any user ID and password will be accepted.

Once "logged in" the user sees various options associated with the teacher's form group. In the demo we explain that parents may want to arrange extra tuition and the "tutors" link allows them to see details of tutors
for that form group. Clicking on the "tutors" icon at the bottom of the page provides a list of tutors for a non-RTC enabled site - the tutors' contact information is available but users have to inconveniently manually
contact the tutors using other methods.

Going back to the form group page and clicking on the "Tutors" link in the menu at the top right of the page loads the RTC enabled version of the tutors page (eg howetutors.html). Here the users can see the status of tutors and 
establish real time communication directly from the web site with a single click. From the RTC enabled tutors page clicking the "call" button will establish an RTC call between the public demo site and the private
tutors site. During the demo we explain how this functionality adds value to the site and the tutors who are now more easily accessible. In this demo the status information is hardcoded and the only tutor shown as available
is "Ben Harrison".

In constructing the demo a simple RTC application (demo.js) was created using the Orca API. The use of Orca makes the application code independent of the RTC provider used to connect the two endpoints. This point can be emphasised
in the demo by showing it is possible to swap between two different providers with very small modifications just by swapping the transport libraries as described above. If the same application had been implemented
using propriety RTC APIs considerable effort may have been required by the application developer to change to another provider.

# 4. Detailed Notes

For convenience this repository contains copies of the JQuery library, the Matrix Web JS client, the demo Matrix/Orca transport library and the demo Orca reflector transport library. For up to date copies of these files
and licensing information please refer to their respective individual sites and repositories.

# ORCA Open Source License Agreement:

Please review the Open Source License Agreement for ORCA: http://orcajs.org/license.html.

