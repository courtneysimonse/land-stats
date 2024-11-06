import axios from "axios";

export default async function fetchApiToken(key, secret, username) {
    const url = "https://land.outseta.com/tokens";
    const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Outseta ${key}:${secret}`,
    };
    const data = new URLSearchParams();
    data.append("username", username);

    try {
        const response = await axios.post(url, data.toString(), { headers });
        return response.data.access_token;
    } catch (error) {
        console.error("Error fetching API token:", error);
        throw error;
    }
}

// Example usage:
// fetchApiToken('your_key', 'your_secret', 'your_username')
//     .then(token => console.log(token))
//     .catch(error => console.error(error));
