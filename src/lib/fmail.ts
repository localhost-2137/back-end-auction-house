export class FMail {
    url: string;
    username: string;
    password: string;

    connected: boolean = false;


    constructor(url: string, username: string, password: string) {
        this.url = url;
        this.username = username;
        this.password = password;

        fetch(new URL("api/auth", this.url), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Username: this.username,
                Password: this.password
            })
        })
            .then((x) => {
                if (x.ok) {
                    this.connected = true;
                    return;
                }

                console.log("Failed to connect to FMail server!");
            })
            .catch(() => {
                console.log("Failed to connect to FMail server!");
            });
    }

    async send(smtpId: string, mail: MailObject) {
        if (!this.connected) {
            console.error("Not connected to FMail server!");
            return;
        }

        await fetch(new URL("api/send", this.url), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                CurrentUsername: this.username,
                CurrentPassword: this.password,

                SmtpId: smtpId,

                Emails: mail.emails,
                IsBodyHTML: mail.isBodyHTML,
                Subject: mail.subject,
                Content: mail.content,
                DisplayName: mail.displayName
            })
        })
            .then((x) => {
                if (x.ok) {
                    return;
                }

                console.log("Failed to send mail!");
            });
    }
}

export type MailObject = {
    emails: string[];
    isBodyHTML: boolean;
    subject: string;
    content: string;
    displayName: string;
}