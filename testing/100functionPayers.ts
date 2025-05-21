// Script to insert 100 unique Tamil payers for the wedding function
import { MongoClient, ObjectId } from 'mongodb';
import * as bcrypt from 'bcryptjs';

// Connection URI with credentials
const uri = 'mongodb://admin:password@localhost:27017/moi_software_db?authSource=admin';
const dbName = 'moi_software_db';

// Define the Payer interface to fix the TypeScript error
interface Payer {
  function_id: string;
  function_name: string;
  payer_name: string;
  payer_phno: string;
  payer_work: string;
  payer_given_object: string;
  payer_cash_method: string;
  payer_amount: number;
  payer_gift_name: string;
  payer_relation: string;
  payer_city: string;
  payer_address: string;
  current_date: Date;
  current_time: string;
  created_by: ObjectId;
  is_deleted: boolean;
  deleted_at: null;
  createdAt: Date;
  updatedAt: Date;
}

// The specific function_id we're adding payers for
const FUNCTION_ID = 'திருமண_விழா-முருகன்_சுப்பிரமணியம்-சென்னை-2025-06-15-10:00_am';
const FUNCTION_NAME = 'திருமண விழா';

// Lists of Tamil names, occupations, relations, and cities for generating diverse data
const tamilFirstNames = [
  "முருகன்", "செல்வம்", "கார்த்திக்", "அருண்", "விஜய்", "சுரேஷ்", "ரமேஷ்", "கிருஷ்ணா", "சுந்தர்", "அன்பு",
  "ஜெயா", "மீனா", "காவ்யா", "லக்ஷ்மி", "பிரியா", "தீபா", "செல்வி", "சரண்யா", "கல்பனா", "கமலா",
  "ராஜன்", "சிவா", "பாலாஜி", "மணி", "கண்ணன்", "குமார்", "தினேஷ்", "மதன்", "ஹரி", "சந்தோஷ்",
  "ராணி", "ரேகா", "சரஸ்வதி", "லலிதா", "அமுதா", "பவானி", "தமிழ்", "நிவேதா", "சங்கீதா", "மாலதி",
  "விக்ரம்", "பிரசாந்த்", "கோபால்", "மகேஷ்", "கோபி", "ராஜேஷ்", "வேலு", "பரத்", "வாசு", "தேவன்",
  "ஜோதி", "கீதா", "சௌந்தர்யா", "பூர்ணிமா", "சௌமியா", "அனுஷா", "பூங்கோதை", "சுமதி", "கௌசல்யா", "அருந்ததி"
];

const tamilLastNames = [
  "சுப்பிரமணியம்", "கிருஷ்ணமூர்த்தி", "நடராஜன்", "சண்முகம்", "கோவிந்தராஜன்", "முரளிதரன்", "வெங்கடேஷ்", "சிவராமன்", "ஆனந்தன்", "சிவகுமார்",
  "ராமசந்திரன்", "மூர்த்தி", "குமாரசாமி", "காளிதாசன்", "பாலசுப்ரமணியன்", "விநாயகம்", "ராஜேந்திரன்", "வேலுசாமி", "பரமசிவம்", "தியாகராஜன்",
  "ரவிச்சந்திரன்", "பழனிசாமி", "நாராயணன்", "கல்யாணசுந்தரம்", "பால்ராஜ்", "அருணாசலம்", "சங்கரநாராயணன்", "சோமசுந்தரம்", "வைத்தியலிங்கம்", "ஆறுமுகம்",
  "ஐயாசாமி", "செந்தில்குமார்", "செல்லத்துரை", "தனசேகரன்", "தியாகராஜன்", "துரைசாமி", "ஜெயராமன்", "லக்ஷ்மணன்", "மருதமுத்து", "மாணிக்கவாசகம்",
  "முத்துசாமி", "மோகன்", "விசுவநாதன்", "விஜயகுமார்", "விஜயராகவன்", "ரங்கசாமி", "ராமலிங்கம்", "ராஜகோபால்", "வடிவேலு", "வரதராஜன்"
];

const tamilOccupations = [
  "மென்பொருள் பொறியாளர்", "மருத்துவர்", "ஆசிரியர்", "வக்கீல்", "வியாபாரி", "கணக்காளர்", "எழுத்தாளர்", "திரைப்பட இயக்குனர்", "தொழிலதிபர்", "பேராசிரியர்",
  "கல்லூரி பேராசிரியர்", "வங்கி மேலாளர்", "ஓய்வுபெற்ற அரசு ஊழியர்", "சட்ட ஆலோசகர்", "பத்திரிகையாளர்", "அரசு ஊழியர்", "பொறியாளர்", "ஓட்டுநர்", "வங்கி ஊழியர்", "வணிகர்",
  "செய்தி வாசிப்பாளர்", "பள்ளி தலைமையாசிரியர்", "கட்டட கலைஞர்", "கலை இயக்குனர்", "கவிஞர்", "பாடகர்", "நகை வடிவமைப்பாளர்", "உளவியலாளர்", "மருத்துவ உதவியாளர்", "நர்ஸ்",
  "சூப்பர்வைசர்", "உணவக உரிமையாளர்", "விவசாயி", "புகைப்பட கலைஞர்", "பொதுத்துறை அதிகாரி", "இசையமைப்பாளர்", "பல் மருத்துவர்", "கண் மருத்துவர்", "அழகு நிபுணர்", "முதலீட்டு ஆலோசகர்"
];

const tamilRelations = [
  "நண்பர்", "குடும்ப நண்பர்", "அத்தை", "மாமா", "தங்கை", "அண்ணன்", "அக்கா", "தம்பி", "மாமனார்", "அத்தை மகன்",
  "மாமா மகன்", "மச்சான்", "அத்தை மகள்", "சித்தப்பா", "சித்தி", "பெரியப்பா", "பெரியம்மா", "மருமகன்", "மருமகள்", "சகோத்திரி",
  "தாத்தா", "பாட்டி", "பேரன்", "பேத்தி", "பள்ளி நண்பர்", "கல்லூரி நண்பர்", "அலுவலக சகஊழியர்", "வணிக கூட்டாளி", "அண்டை வீட்டுக்காரர்", "ஊழியர்",
  "மாணவர்", "ஆசிரியர்", "பணியாளர்", "உறவினர்", "அப்பா வழி சொந்தம்", "அம்மா வழி சொந்தம்", "தெரிந்தவர்", "தொழில் நண்பர்", "சகோதரி", "சம்பந்தி"
];

const tamilCities = [
  "சென்னை", "கோயம்புத்தூர்", "மதுரை", "திருச்சி", "சேலம்", "ஈரோடு", "திருநெல்வேலி", "தூத்துக்குடி", "திண்டுக்கல்", "திருப்பூர்",
  "கும்பகோணம்", "காஞ்சிபுரம்", "வேலூர்", "நாகர்கோவில்", "கடலூர்", "தஞ்சாவூர்", "கரூர்", "விழுப்புரம்", "புதுக்கோட்டை", "ராமநாதபுரம்",
  "உடுமலைப்பேட்டை", "அம்பத்தூர்", "ஆவடி", "பாண்டிச்சேரி", "நாகப்பட்டினம்", "சிவகாசி", "விருதுநகர்", "கன்னியாகுமரி", "பெரம்பலூர்", "திருவண்ணாமலை"
];

const giftItems = [
  "வெள்ளி தட்டு", "தங்க நாணயம்", "வெள்ளி குடம்", "பட்டுப்புடவை", "பட்டுவேட்டி", "படு நெரி", "தங்க வளையல்", "தங்க மோதிரம்", "தங்க சங்கிலி", "வெள்ளி விளக்கு",
  "வெள்ளி குத்துவிளக்கு", "வெள்ளி குங்கும சிமிழ்", "பூஜை பொருட்கள்", "தங்க காதோலை", "தங்க காசு", "தங்க மேலை", "கிருஷ்ணர் சிலை", "வெள்ளி பூஜை பொருட்கள் செட்", "வெள்ளி தாம்பாளம்", "மிக்ஸி"
];

// Cash or gift options
const paymentTypes = ["பணம்", "பொருள்"];
const paymentMethods = ["Cash", "GPay", ""];

async function insertHundredPayers() {
  try {
    // Create a new MongoClient
    const client = new MongoClient(uri);
    
    // Connect to the client
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    
    // Get the database
    const db = client.db(dbName);
    
    // Define collection
    const payersCollection = db.collection('payers');
    
    // Get admin user ID for created_by field
    const adminUser = await db.collection('users').findOne({ email: "tamiluser@example.com" });
    const adminUserId = adminUser?._id;
    
    if (!adminUserId) {
      throw new Error("Admin user not found! Please run the main seed script first.");
    }
    
    // Generate 100 unique payers
    const payers: Payer[] = [];
    
    // Phone number counter starting point
    let phoneCounter = 8800000000;
    
    // Create the base date for transaction recording
    const baseDate = new Date("2025-06-10T09:00:00.000Z");
    
    // Generate 100 unique payers
    for (let i = 0; i < 100; i++) {
      // Generate random data
      const firstNameIndex = Math.floor(Math.random() * tamilFirstNames.length);
      const lastNameIndex = Math.floor(Math.random() * tamilLastNames.length);
      const fullName = `${tamilFirstNames[firstNameIndex]} ${tamilLastNames[lastNameIndex]}`;
      
      const occupation = tamilOccupations[Math.floor(Math.random() * tamilOccupations.length)];
      const relation = tamilRelations[Math.floor(Math.random() * tamilRelations.length)];
      const city = tamilCities[Math.floor(Math.random() * tamilCities.length)];
      
      // Increment phone number to ensure uniqueness
      const phone = (phoneCounter++).toString();
      
      // Determine if this payer gives cash or gift
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)];
      
      // Set parameters based on payment type
      let paymentAmount = 0;
      let paymentMethod = "";
      let giftName = "";
      
      if (paymentType === "பணம்") {
        // For cash payments, generate an amount between 1,000 and 50,000
        paymentAmount = Math.floor(Math.random() * 49000) + 1000;
        // Round to nearest 500
        paymentAmount = Math.round(paymentAmount / 500) * 500;
        
        // Set payment method (Cash or GPay)
        paymentMethod = paymentMethods[Math.floor(Math.random() * 2)]; // Only Cash or GPay for payments
      } else {
        // For gifts, set a gift name
        giftName = giftItems[Math.floor(Math.random() * giftItems.length)];
      }
      
      // Generate transaction date/time (between 5 days before wedding)
      const dayOffset = Math.floor(Math.random() * 5); // 0-4 days before wedding
      const hourOffset = Math.floor(Math.random() * 8) + 9; // 9AM to 5PM
      const minuteOffset = Math.floor(Math.random() * 60); // 0-59 minutes
      
      const transactionDate = new Date(baseDate);
      transactionDate.setDate(transactionDate.getDate() + dayOffset);
      transactionDate.setHours(hourOffset, minuteOffset);
      
      // Format time as a string
      const timeStr = `${hourOffset}:${minuteOffset.toString().padStart(2, '0')} ${hourOffset >= 12 ? 'PM' : 'AM'}`;
      
      // Create payer object
      const payer: Payer = {
        function_id: FUNCTION_ID,
        function_name: FUNCTION_NAME,
        payer_name: fullName,
        payer_phno: phone,
        payer_work: occupation,
        payer_given_object: paymentType,
        payer_cash_method: paymentMethod,
        payer_amount: paymentAmount,
        payer_gift_name: giftName,
        payer_relation: relation,
        payer_city: city,
        payer_address: `${Math.floor(Math.random() * 200) + 1}, ${city} மெயின் ரோடு, ${city}`,
        current_date: transactionDate,
        current_time: timeStr,
        created_by: adminUserId,
        is_deleted: false,
        deleted_at: null,
        createdAt: transactionDate,
        updatedAt: transactionDate
      };
      
      payers.push(payer);
    }
    
    // Insert payers into the database
    const payerResult = await payersCollection.insertMany(payers);
    console.log(`${payerResult.insertedCount} payers inserted for function: ${FUNCTION_ID}`);
    
    // Calculate statistics
    const cashPayers = payers.filter(p => p.payer_given_object === "பணம்");
    const giftPayers = payers.filter(p => p.payer_given_object === "பொருள்");
    const cashAmount = cashPayers.reduce((sum, payer) => sum + payer.payer_amount, 0);
    
    console.log("\n--- Statistics ---");
    console.log(`Total Payers: ${payers.length}`);
    console.log(`Cash Payers: ${cashPayers.length} (Total: ₹${cashAmount.toLocaleString()})`);
    console.log(`Gift Payers: ${giftPayers.length}`);
    
    // Close the connection
    await client.close();
    console.log("MongoDB connection closed");
    
  } catch (error) {
    console.error("Error inserting payers:", error);
  }
}

// Run the script
insertHundredPayers();