async function loadPosts() {
    try {
        const response = await fetch('http://localhost:8080/posts');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const postsData = await response.json();
        const postsContainer = document.getElementById('posts-container');
        postsContainer.innerHTML = '';

        postsData.forEach(postData => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');

            const commentsHTML = postData.comments
                .map(comment => `<div class="comment">${comment.content}</div>`)
                .join('');

            postElement.innerHTML = `
                <h2>Posted by: ${postData.user.username}</h2>
                <p>${postData.post.content}</p>
                <button onclick="addLike(${postData.post.id})">Like</button>
                <p>Likes: ${postData.likes}</p>
                <h3>Comments:</h3>
                ${commentsHTML}
                <form onsubmit="addComment(event, ${postData.post.id})">
                    <input type="text" name="comment" placeholder="Write a comment..." required>
                    <button type="submit">Submit Comment</button>
                </form>
            `;
            postsContainer.appendChild(postElement);
        });

    } catch (error) {
        console.error('Could not load posts:', error);
    }
}

function addLike(postId) {
    console.log(`Adding like to post ${postId}`);
    fetch('http://localhost:8080/add-like', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            postId: postId,
        })
    })
    .then(() => {
        window.location.reload();
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Could not submit post:', error);
    });
}

function addComment(event, postId) {
    event.preventDefault();
    const commentContent = event.target.comment.value;
    console.log(`Adding comment to post ${postId}: ${commentContent}`);
    fetch('http://localhost:8080/add-comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            postId: postId,
            commentContent: commentContent
        })
    })
    .then(() => {
        window.location.reload();
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Could not submit post:', error);
    });
}

function submitPost() {
    const userId = document.getElementById('user-id').value;
    const content = document.getElementById('post-content').value;

    fetch('http://localhost:8080/add-post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            content: content
        })
    })
    .then(() => {
        window.location.reload();
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Could not submit post:', error);
    });
}

function submitUser() {
    const userId = document.getElementById('add-user-id').value;
    const userNickname = document.getElementById('add-user-nickname').value;

    fetch('http://localhost:8080/add-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId: userId,
            userNickname: userNickname
        })
    })
    .then(() => {
        window.location.reload();
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log(data);
    })
    .catch(error => {
        console.error('Could not submit post:', error);
    });
}

window.onload = loadPosts;
