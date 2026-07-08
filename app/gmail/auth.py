"""
Run this once: `python -m app.gmail.auth`
Completes the OAuth2 flow and caches a token so the poller never needs a
browser again. Requires credentials.json from Google Cloud Console
(OAuth client type: Desktop app).

Always uses run_local_server(), not the old run_console() flow — Google
removed support for the copy-paste "out-of-band" OOB flow in 2022, so
run_console() no longer works with current Google accounts even where the
library still exposed it (older google-auth-oauthlib versions removed the
method entirely, which is the error you'll see if something upstream still
calls it).

This works fine on Termux specifically because Termux runs directly on your
phone: 127.0.0.1 here is the same device as your phone's browser. The flow
starts a tiny local server, prints a URL, you open that URL in Chrome (same
phone), approve access, and the redirect lands back on that local server.
On a headless remote VPS this approach needs an SSH tunnel instead — not
needed here.
"""
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from config.config import settings

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
]


def get_credentials() -> Credentials:
    creds = None
    if os.path.exists(settings.gmail_token_file):
        creds = Credentials.from_authorized_user_file(settings.gmail_token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(settings.gmail_credentials_file):
                raise FileNotFoundError(
                    f"{settings.gmail_credentials_file} not found. Download OAuth2 "
                    "Desktop app credentials from Google Cloud Console and place them "
                    "at this path."
                )
            flow = InstalledAppFlow.from_client_secrets_file(
                settings.gmail_credentials_file, SCOPES
            )
            print(
                "\nOpen the URL below in your phone's browser to authorize Gmail "
                "access, then return here — it'll complete automatically once you "
                "approve (this local server is running on the same device as your "
                "browser, so no copy-pasting a code is needed).\n"
            )
            creds = flow.run_local_server(
                port=0,
                open_browser=False,  # Termux can't launch Chrome itself; prints the URL instead
                authorization_prompt_message="{url}",
                success_message="Authorization complete — you can close this browser tab and return to Termux.",
            )

        with open(settings.gmail_token_file, "w") as token_file:
            token_file.write(creds.to_json())

    return creds


if __name__ == "__main__":
    creds = get_credentials()
    print("\nGmail OAuth2 authentication successful. Token cached at:", settings.gmail_token_file)
