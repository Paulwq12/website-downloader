async function fetchWebsite() {
    const url = document.getElementById("website-url").value;
    if (!url) {
        alert("Please enter a website URL!");
        return;
    }

    document.getElementById("status").innerText = "Fetching website... Please wait.";

    try {
        const response = await fetch("/fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        if (data.zipFile) {
            document.getElementById("status").innerHTML = `
                <a href="${data.zipFile}" download>Click here to download</a>
            `;
        } else {
            document.getElementById("status").innerText = "Error fetching website.";
        }
    } catch (error) {
        document.getElementById("status").innerText = `Error fetching website: ${error.message}`;
    }
}
