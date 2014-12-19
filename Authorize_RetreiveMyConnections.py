__author__ = 'Michael'
from linkedin import linkedin # pip install python-linkedin

# Define CONSUMER_KEY, CONSUMER_SECRET,
# USER_TOKEN, and USER_SECRET from the credentials
# provided in your LinkedIn application

CONSUMER_KEY = '78unrfli4a2kup'
CONSUMER_SECRET = 'HwPe44Qsm9L8mHlu'
USER_TOKEN = '8bfde97b-eac6-464e-b132-ea3a3c897d3f'
USER_SECRET = '79f0f4cc-b59e-406d-ab34-8a1e307051cc'

RETURN_URL = '' # Not required for developer authentication

# Instantiate the developer authentication class

auth = linkedin.LinkedInDeveloperAuthentication(CONSUMER_KEY, CONSUMER_SECRET,
                                USER_TOKEN, USER_SECRET,
                                RETURN_URL,
                                permissions=linkedin.PERMISSIONS.enums.values())

# Pass it in to the app...

app = linkedin.LinkedInApplication(auth)

# Use the app...
####
app.get_profile()

import json

connections = app.get_connections()

connections_data = 'linkedin_connections.json'

f = open(connections_data, 'w')
f.write(json.dumps(connections, indent=1))
f.close()

# You can reuse the data without using the API later like this...
# connections = json.loads(open(connections_data).read())