perseus project design blue print

perseus is a web project base on nextjs , use react best practise skills to implement the frontend use nextjs and tailwindcss and use postgres skills to design the database schema and implement the backend and api interface use nodejs , and use database migration skill to implement the db migration  with prisma

platform will running on a docker compose in dev with containers :
platform service 
postgresql server
redis server

use a /workspace volume for workspace files , reserve the S3 and wasabi storage interface for future , use different folder  level  tenant /teams/chatgroup/human or robot

concept :

what is this web page ? 

	this web page is a platform that manage robots ,  in this web page can arrange task to robot and check robot work progress , i will call it platform in this doc .
	
	the overview structure :
	
	platform -> tenant -> teams ->chatgroup -> human or robots

what is a robot ? 

	A robot is a nanobot ai agent that running on a real computer , the robot just like a real human , it have ears can listen the tasks from platform , it have mouth can chat and response to platform, and it has hands to execute the actions by using tool  ... etc , I have already implement the robot under robot/ folder , but I only implement the local running , you need to add it connect to platform . 

what is a chatgroup ?

	a chatgroup is a chat window contains a left list pannel showing recent used groups , click group section will show chat body at right , chat body contains chat viewing part on the top with 60% height and 40% height of chat editing window for user typing , when use input '@' will show a dropdown popup to quick select robot or human inside team. 

what is a workspace ?

	a workspace is a simple file share place inside a chatgroup  or a team or a tenant , the inherit permission is tenant level files will inherit to team , team level files will inherit to chatgroup : tenant files > team files > chatgroup files

what is a team ? 

	a team is the minimal structure which contain robots and human , and each team has a chatgroup on platform , in the chat group can send file to workspace , and robot or human can get the file path and download it , also in the chatgroup can use '@' to at robot to assign task . one team can have multi chatgroups with different members , anyone inside team can create a chatgroup , a chatgroup minimal member is 2 , at least 2 human or 1 human  1 robot , only 2 robot is not allowed . 

how to assign task in chatgroup ?
	
	in the chat edit window use '@' to mention robot , for example :
	
	@Jane Generate a python code to output a triangle in terminal 
	
	this command 'Generate a python code to output a triangle in terminal' will send to the nanobot service which running Jane , and the nanobot will deal with the command and return the result to chatgroup

what is a human ?

	a human is a real human who can manage robot ,teams .


how to onboard a robot ?

	the robot onboard process is , user create a robot  on platform , need to define the robot name and soul.md , then in the robot manage view will have a button 'assign a pc' for this robot , then will generate a robot-token , this is a jwt token can be decode to json , it contains the robot name,create user,belong teams , tenant etc info , and this token is the credential that the nanobot communicate with platform , default this token will never expired , but user can choose the expired time. after that , on nanobot onboard step will require to input this token and set the base_url (platform url) , nanobot will call platform api to get all the onboard required info like openai base url and openai api key or anthropic base url and apikey , after setup all thing need to test the nanobot functionality and connectivity to platform  , if every going well show robot is onboard on platform otherwise show robot is onboarding ... 



about  login auth : 

	multi tenant auth , role base access , the tenant owner can grant tenant admin to any user under tenant, built-in roles are : 
	
	owner: full control 
	
	admin : full control except grant admin role
	
	user : able to mange only  his team resources
	
	onboard : onboard means create a new tenant , user must already sign up with phone number , use aliyun phone number verification  
	
	one email could be many tenant owner , if it has multi tenant bind , show a tenant select page before he login
	
	api-key , api-key  has 2 levels : tenant level -> only admin and owner can create and use it . user level , all users include admin and owner can create and use it as credential to call api endpoints
	
	tenant manage page : 
	
	support add/remove/edit/query users under tenant
	
	support add/remove/edit/query teams under tenant
	
	support add/remove/edit/query robots. under tenant
	
	team manage page:
	
	assign/remove users/robots to a team 
	
	team shared files ,

APIs : use api design principle skill to design RESTful APIs 
	the api is designed to used by robots , robots can use its robot-token to get the data from platform ,and this api will packaged as a MCP server at nanobot side , require only platform url and robot-token  , this MCP server inside will call the platform APIs 
chatgroup CRUD : able to CRUD member(human or robot) to existing chatgroup ,or create a new chatgroup with member id 
chat CRUD : send message to dedicated chatgroup , get history messages , get workspace file path ,delete history messages , update history messages

workspace files CRUD , principle rules : robot can only the workspace files from where it called , not allowed CRUD other chatgroup files


MCP :
implement the mcp with the API interface use mcp-builder skill

integrate platform mcp into nanobot as default , 




	









