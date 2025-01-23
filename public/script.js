async function fetchWebsite() {
    const url = document.getElementById("website-url").value;
    if (!url) {
        alert("Please enter a website URL!");
        return;
    }

    document.getElementById("status").innerText = "Fetching website... Please wait.";

    const response = await fetch("/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    });

    const data = await response.json();
    if (data.zipFile) {
        document.getElementById("status").innerHTML = `
            <a href="${data.zipFile}" download>Click here to download</a>
        `;
    } else {
        document.getElementById("status").innerText = "Error fetching website.";
    }
}
