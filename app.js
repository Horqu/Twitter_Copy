const neo4j = require('neo4j-driver');
const express = require('express');
const cors = require('cors');
const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

class Neo4jConnection {
    constructor(uri, user, password) {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }

    close() {
        this.driver.close();
    }

    async query(query, parameters = {}) {
        const session = this.driver.session();
        try {
            const result = await session.run(query, parameters);
            return result.records;
        } catch (error) {
            console.error('Query failed:', error);
        } finally {
            await session.close();
        }
    }
}

async function addUser(conn, userId, username) {
    const result = await conn.query(
        "CREATE (u:UserNode {id: $id, username: $name, creationDate: datetime()}) RETURN u",
        { id: userId, name: username }
    );
    return result;
}

async function addPost(conn, postId, postContent) {
    const result = await conn.query(
        "CREATE (p:PostNode {id: $id, content: $content, creationDate: datetime()}) RETURN p",
        { id: postId, content: postContent }
    );
    return result;
}

async function addComment(conn, commentId, commentContent) {
    const result = await conn.query(
        "CREATE (c:CommentNode {id: $id, content: $content, creationDate: datetime()}) RETURN c",
        { id: commentId, content: commentContent }
    );
    return result;
}

async function addLike(conn, likeId) {
    const result = await conn.query(
        "CREATE (l:LikeNode {id: $id, creationDate: datetime()}) RETURN l",
        { id: likeId }
    );
    return result;
}

async function createUserPostRelation(conn, userId, postId) {
    const result = await conn.query(
        "MATCH (u:UserNode {id: $userId}), (p:PostNode {id: $postId}) " +
        "CREATE (u)-[:CREATES]->(p) " +
        "RETURN u, p",
        { userId: userId, postId: postId }
    );
    return result;
}

async function createCommentPostRelation(conn, commentId, postId) {
    const result = await conn.query(
        "MATCH (c:CommentNode {id: $commentId}), (p:PostNode {id: $postId}) " +
        "CREATE (c)-[:BELONGS]->(p) " +
        "RETURN c, p",
        { postId: postId, commentId: commentId }
    );
    return result;
}

async function createLikePostRelation(conn, likeId, postId) {
    const result = await conn.query(
        "MATCH (l:LikeNode {id: $likeId}), (p:PostNode {id: $postId}) " +
        "CREATE (l)-[:BELONGS]->(p) " +
        "RETURN l, p",
        { postId: postId, likeId: likeId }
    );
    return result;
}

async function getPostData(conn, postId) {
    console.log(postId);
    let postIdFloat = parseFloat(postId);
    console.log(postIdFloat);
    return await conn.query(
        `MATCH (p:PostNode {id: $id})<-[:CREATES]-(u:UserNode),
              (p)<-[:BELONGS]-(c:CommentNode),
              (p)<-[:BELONGS]-(l:LikeNode)
        RETURN p, u, collect(c) as comments, collect(l) as likes`,
        { id: postIdFloat }
    );
}

app.get('/posts', async (req, res) => {
    const query = `
        MATCH (p:PostNode)<-[:CREATES]-(u:UserNode)
        OPTIONAL MATCH (p)<-[:BELONGS]-(c:CommentNode)
        WITH p, u, collect(c) AS comments
        OPTIONAL MATCH (p)<-[:BELONGS]-(l:LikeNode)
        RETURN p AS post, u AS user, comments, count(l) AS likes
    ` 

    const conn = new Neo4jConnection(uri, user, password);
    
    try {
        const posts = await conn.query(query);
        const formattedPosts = posts.map(record => {
            return {
                post: record.get('post').properties,
                user: record.get('user').properties,
                comments: record.get('comments').map(comment => comment ? comment.properties : {}),
                likes: record.get('likes').low 
            };
        });
        
        console.log(formattedPosts);
        res.json(formattedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Error fetching posts');
    } finally {
        await conn.close();
    }
});

app.post('/add-post', async (req, res) => {
    const userId = req.body.userId;
    const content = req.body.content;


    const conn = new Neo4jConnection(uri, user, password);
    const query = 'MATCH (p:PostNode) RETURN count(p) AS numberOfPosts';

    try {
        const result = await conn.query(query);
        const numberOfPosts = result[0].get('numberOfPosts').toNumber(); 
        console.log(`Number of posts: ${numberOfPosts}`);

        await addPost(conn, parseFloat(numberOfPosts) + 1, content);
        await createUserPostRelation(conn, userId, numberOfPosts + 1);
        res.status(200).send('Post added successfully');
    } catch (error) {
        console.error('Błąd podczas pobierania liczby postów:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        conn.close(); 
    }

});

app.post('/add-user', async (req, res) => {
    const userId = req.body.userId;
    const userNickname = req.body.userNickname;

    const conn = new Neo4jConnection(uri, user, password);

    try {
        await addUser(conn, userId, userNickname);
        res.status(200).send('New user created successfully');
    } catch (error) {
        console.error('Błąd podczas pobierania liczby postów:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        conn.close();
    }
});

app.post('/add-comment', async (req, res) => {
    const postId = req.body.postId;
    const commentContent = req.body.commentContent;

    const conn = new Neo4jConnection(uri, user, password);
    const query = 'MATCH (c:CommentNode) RETURN count(c) AS numberOfComments';

    try {
        const result = await conn.query(query);
        const numberOfComments = result[0].get('numberOfComments').toNumber(); 
        console.log(`Number of Comments: ${numberOfComments}`);

        await addComment(conn, parseFloat(numberOfComments) + 1, commentContent);
        await createCommentPostRelation(conn, parseFloat(numberOfComments) + 1, postId);
        res.status(200).send();
    } catch (error) {
        console.error('Błąd podczas pobierania liczby postów:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        conn.close();
    }
});

app.post('/add-like', async (req, res) => {
    const postId = req.body.postId;

    const conn = new Neo4jConnection(uri, user, password);
    const query = 'MATCH (l:LikeNode) RETURN count(l) AS numberOfLikes';

    try {
        const result = await conn.query(query);
        const numberOfLikes = result[0].get('numberOfLikes').toNumber(); 
        console.log(`Number of Likes: ${numberOfLikes}`);

        await addLike(conn, parseFloat(numberOfLikes) + 1);
        await createLikePostRelation(conn, parseFloat(numberOfLikes) + 1, postId);
        res.status(200).send();
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    } finally {
        conn.close();
    }
});

app.get('/post/:id', async (req, res) => {

    const conn = new Neo4jConnection(uri, user, password);

    try {
        const postData = await getPostData(conn, req.params.id);
        res.json(postData);
    } catch (error) {
        res.status(500).send(error.toString());
    } finally {
        await conn.close();
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
