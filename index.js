const express = require('express');
var cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const moment = require('moment-timezone');





const app = express();
const port = 3002;



// const exampleProxy = createProxyMiddleware({
//   target: 'http://127.0.0.1:5500', // target host with the same base path
//   changeOrigin: true, // needed for virtual hosted sites
// });




app.use(cors());

// var corsOptions = {
//   origin: 'http://127.0.0.1:5500',
//   optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
// }





//Create a connection pool to MySQL database
const pool = mysql.createPool({
    host: 'srv843.hstgr.io',
    user: 'u176507776_hpTest_db_user',
    password: 'Hp_test_db_123',
    database: 'u176507776_hp_test_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Set up Multer for handling file uploads
const storage = multer.diskStorage({
  destination: 'govt/',
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(express.json());

app.use(express.urlencoded({ extended: true }));


//test route to check server status
app.get('/test', (req,res)=>{
    res.status(200).send("Server is working - 11ghhg");
})
app.get('/test2', (req,res)=>{
    res.status(200).json({message : "Server is working - 11ghhg"});
})


// API 1 - User Registration
app.post('/register', upload.none(), async (req, res) => {
    console.error("register")
  const { first_name, last_name, mobile_no, email, password, confirm_password } = req.body;
  
  console.error(first_name, last_name, mobile_no, email, password, confirm_password);

  // Validate password match
  if (password !== confirm_password) {
    return res.status(400).json({ message: "Passwords do not match." });
  }

  try {
    const connection = await pool.getConnection();
    const [existingUser] = await connection.query('SELECT user_id FROM users WHERE email = ?', [email]);

    if (existingUser.length > 0) {
      connection.release();
      return res.status(409).json({ message: "Email already registered." });
    }

    const result = await connection.query('INSERT INTO users (first_name, last_name, mobile_no, email, password) VALUES (?, ?, ?, ?, ?)', [first_name, last_name, mobile_no, email, password]);
    connection.release();

    if (result.affectedRows > 0) {
      return res.status(201).json({ message: "User registered successfully." });
    } else {
      return res.status(500).json({ message: "Failed to register user." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
});

// API 2 - User Login
app.post('/login',upload.none() ,  async (req, res) => {
  const { email, password } = req.body;

  try {
    const connection = await pool.getConnection();
    const [user] = await connection.query('SELECT user_id FROM users WHERE email = ? AND password = ?', [email, password]);
    connection.release();

    if (user.length > 0) {
      return res.status(200).json({ user_id: user[0].user_id });
    } else {
      return res.status(401).json({ message: "Invalid credentials." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
});

// API 3 - Upload Govt ID
app.post('/upload-govt-id', upload.single('govt_id_image'), async (req, res) => {
  const { user_id } = req.body;
  const govt_id_name = req.file.filename;

  try {
    const connection = await pool.getConnection();
    const result = await connection.query('UPDATE users SET govt_id_name = ? WHERE user_id = ?', [govt_id_name, user_id]);
    connection.release();

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Govt ID uploaded successfully." });
    } else {
      return res.status(500).json({ message: "Failed to upload Govt ID." });
    }
  } catch (error) {
    return res.status(500).json({ message: "Internal server error." });
  }
});

// API 4 - Add Party
app.post('/add-party', upload.fields([
  { name: 'image_name_1', maxCount: 1 },
  { name: 'image_name_2', maxCount: 1 },
  { name: 'image_name_3', maxCount: 1 },
  { name: 'image_name_4', maxCount: 1 }
]), async (req, res) => {
  const {
    party_name, price_per_person, date, time, no_of_guest, address, description,
    rules_included, rules_excluded, cancellation_policy, how_it_works, location
  } = req.body;

  const images = req.files;
  const imagePaths = [];

  try {
    const connection = await pool.getConnection();
    const result = await connection.query('INSERT INTO parties (party_name, price_per_person, date, time, no_of_guest, address, description, rules_included, rules_excluded, cancellation_policy, how_it_works, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [party_name, price_per_person, date, time, no_of_guest, address, description, rules_included, rules_excluded, cancellation_policy, how_it_works, location]);

    const partyId = result.insertId;

    for (const imageField in images) {
      if (images.hasOwnProperty(imageField)) {
        const image = images[imageField][0];
        const uniqueImageName = `${partyId}-${Date.now()}-${image.originalname}`;
        const imagePath = path.join(__dirname, 'party', `image${imageField.split('_')[2]}`, uniqueImageName);

        await image.mv(imagePath);
        imagePaths.push(uniqueImageName);
      }
    }

    await connection.query('UPDATE parties SET image_name_1 = ?, image_name_2 = ?, image_name_3 = ?, image_name_4 = ? WHERE party_id = ?', [imagePaths[0], imagePaths[1], imagePaths[2], imagePaths[3], partyId]);

    connection.release();

    return res.status(201).json({ message: "Party added successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// API 5 - Add Place
app.post('/add-place', upload.fields([
  { name: 'image_name_1', maxCount: 1 },
  { name: 'image_name_2', maxCount: 1 },
  { name: 'image_name_3', maxCount: 1 },
  { name: 'image_name_4', maxCount: 1 }
]), async (req, res) => {
  const {
    place_name, price_per_person, date, time, no_of_guest, address, description,
    rules_included, rules_excluded, cancellation_policy, how_it_works, location
  } = req.body;

  const images = req.files;
  const imagePaths = [];

  try {
    const connection = await pool.getConnection();
    const result = await connection.query('INSERT INTO places (place_name, price_per_person, date, time, no_of_guest, address, description, rules_included, rules_excluded, cancellation_policy, how_it_works, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [place_name, price_per_person, date, time, no_of_guest, address, description, rules_included, rules_excluded, cancellation_policy, how_it_works, location]);

    const placeId = result.insertId;

    for (const imageField in images) {
      if (images.hasOwnProperty(imageField)) {
        const image = images[imageField][0];
        const uniqueImageName = `${placeId}-${Date.now()}-${image.originalname}`;
        const imagePath = path.join(__dirname, 'place', `image${imageField.split('_')[2]}`, uniqueImageName);

        await image.mv(imagePath);
        imagePaths.push(uniqueImageName);
      }
    }

    await connection.query('UPDATE places SET image_name_1 = ?, image_name_2 = ?, image_name_3 = ?, image_name_4 = ? WHERE place_id = ?', [imagePaths[0], imagePaths[1], imagePaths[2], imagePaths[3], placeId]);

    connection.release();

    return res.status(201).json({ message: "Place added successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
});


//dashboard user profie info
app.get('/dashboard/user/:user_id', async (req, res) => {
  const { user_id } = req.params;

  try {
    const connection = await pool.getConnection();
    const userQuery = 'SELECT first_name , last_name ,  email, mobile_no, created_at FROM users WHERE user_id = ?';
    const [userDetails] = await connection.query(userQuery, [user_id]);

    const formattedCreatedAt = moment(userDetails[0].created_at).format('MMM YYYY');

    connection.release();

    const result = {
      name : userDetails[0].first_name + userDetails[0].last_name ,     
      email: userDetails[0].email,
      mobile_no: userDetails[0].mobile_no,
      joined: formattedCreatedAt
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});

//dashboard user party booking 
app.get('/dashboard/party-bookings/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const currentDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

  try {
    const connection = await pool.getConnection();
    const attendingQuery = 'SELECT COUNT(*) AS attending_count FROM party_bookings WHERE user_id = ? AND status = "approved" AND booking_date > ?';
    const attendedQuery = 'SELECT COUNT(*) AS attended_count FROM party_bookings WHERE user_id = ? AND status = "approved" AND booking_date <= ?';

    const [attendingResult] = await connection.query(attendingQuery, [user_id, currentDate]);
    const [attendedResult] = await connection.query(attendedQuery, [user_id, currentDate]);

    connection.release();

    const result = {
      attending: attendingResult[0].attending_count,
      attended: attendedResult[0].attended_count
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});


//dashboard user party host 
app.get('/dashboard/party-hosting/:user_id', async (req, res) => {
  const { user_id } = req.params;
  const currentDate = moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss');

  try {
    const connection = await pool.getConnection();
    const hostingQuery = 'SELECT COUNT(*) AS hosting_count FROM parties WHERE host_id = ? AND date > ?';
    const hostedQuery = 'SELECT COUNT(*) AS hosted_count FROM parties WHERE host_id = ? AND date <= ?';

    const [hostingResult] = await connection.query(hostingQuery, [user_id, currentDate]);
    const [hostedResult] = await connection.query(hostedQuery, [user_id, currentDate]);

    connection.release();

    const result = {
      hosting: hostingResult[0].hosting_count,
      hosted: hostedResult[0].hosted_count
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
});





app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});





