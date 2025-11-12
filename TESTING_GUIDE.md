# 🧪 Testing Guide for New Features

## Quick Test Checklist

### 1. Start the Development Server
```powershell
npm run dev
```
Open: http://localhost:3000

---

### 2. Login/Signup
- Navigate to `/login` or `/signup`
- Create a test account or use existing credentials
- Verify successful authentication

---

### 3. Initialize Cloud Data (First Time Only)

**Steps**:
1. Go to Dashboard
2. Look for floating purple button (bottom-right corner)
3. Click "Initialize Data"
4. Wait for success message: "✅ Cloud data initialized successfully!"

**What This Does**:
- Creates `communityStats/environmentalData` document
- Adds 6 local projects to `localProjects` collection
- Adds 10 pollution hotspots to `pollutionHotspots` collection
- Adds 5 environmental changes to `environmentalChanges` collection

**Expected Console Output**:
```
🚀 Starting Firebase data initialization...
✅ Environmental data initialized
✅ 6 local projects initialized
✅ 10 pollution hotspots initialized
✅ 5 environmental changes initialized
✅ All data initialized successfully!
📊 Cloud-based data integration complete
```

---

### 4. Test AI Waste Classifier

**Location**: Dashboard → Scroll down to "AI Waste Classifier" section

**Test Steps**:
1. **Upload Image**:
   - Click on upload area OR drag & drop an image
   - Accept JPG, PNG, HEIC (max 5MB)
   - Verify image preview appears

2. **Classify**:
   - Click "Classify Waste" button
   - Wait 2 seconds for simulated AI processing
   - Verify spinner animation during processing

3. **Check Results**:
   - ✅ Category name displayed
   - ✅ Confidence percentage shown (with progress bar)
   - ✅ Recyclable status (green checkmark or red X)
   - ✅ Disposal instructions text
   - ✅ Pro tips section

4. **Reset & Retry**:
   - Click "Classify Another Item"
   - Verify form resets to upload state
   - Try with different image

**Expected Categories** (Random for demo):
- Plastic Bottle (95% confidence, recyclable)
- Cardboard (92% confidence, recyclable)
- Glass Bottle (88% confidence, recyclable)
- Aluminum Can (94% confidence, recyclable)
- Food Waste (89% confidence, compostable)
- Paper (91% confidence, recyclable)
- Electronic Waste (87% confidence, special disposal)
- General Waste (76% confidence, non-recyclable)

---

### 5. Test Geospatial Analytics Map

**Location**: Dashboard → Click "Show Community Environmental Data" → Scroll to map

**Test Steps**:

#### A. View Pollution Hotspots
1. **Default View**:
   - Verify map placeholder displays
   - Check "All Types" filter is active
   - See statistics cards (Active Hotspots, High Priority, Total Reports)

2. **Filter by Type**:
   - Click "Air Pollution" → see filtered results
   - Click "Water Contamination" → see filtered results
   - Click "Illegal Dumping" → see filtered results
   - Click "Deforestation" → see filtered results
   - Click "All Types" → see all results again

3. **Check Hotspot Cards**:
   - Verify severity indicator (colored left bar)
   - Check location address displayed
   - Verify GPS coordinates shown
   - Click "Open in Maps" → should open Google Maps

4. **Verify Severity Colors**:
   - 🟢 Low: Green (#4CAF50)
   - 🟠 Medium: Orange (#FF9800)
   - 🔴 High: Red (#F44336)
   - 🔴 Critical: Dark Red (#B71C1C)

#### B. View Environmental Changes
1. Click "Environmental Changes" tab
2. Verify 4 change cards display:
   - Air Quality Improvements (+12%)
   - Water Quality Decline (-8%)
   - Recycling Rate Growth (+15%)
   - Tree Planting Progress (+2,500 trees)

3. Check "Recent Environmental Changes" timeline
4. Verify improvement/degradation indicators (↑/↓)

---

### 6. Test Real-Time Data Sync

**Using Firebase Console**:

1. Open Firebase Console: https://console.firebase.google.com
2. Select your GreenGuardian project
3. Navigate to Firestore Database

#### Test Environmental Data Updates:
1. Open `communityStats/environmentalData` document
2. Change `airQualityIndex` value (e.g., from 85 to 150)
3. **Check Dashboard**: Air quality should update immediately
4. Verify new value displays without page refresh

#### Test Pollution Hotspots:
1. Open `pollutionHotspots` collection
2. Add a new document:
```json
{
  "location": {
    "latitude": 14.5995,
    "longitude": 120.9842,
    "address": "Test Location, Metro Manila"
  },
  "type": "air-pollution",
  "severity": "high",
  "reports": 5,
  "description": "Test hotspot",
  "lastUpdated": [timestamp]
}
```
3. **Check Geospatial Map**: New hotspot should appear instantly
4. Delete the test document
5. **Verify**: Hotspot disappears from map

---

### 7. Test Environmental Data Display

**Location**: Dashboard → Click "Show Community Environmental Data"

**Verify Display**:
1. **Air Quality Card**:
   - ✅ AQI number displayed
   - ✅ Quality label (Good, Moderate, Unhealthy, etc.)
   - ✅ Color-coded progress bar
   - ✅ Activity recommendation text

2. **Water Quality Card**:
   - ✅ WQI percentage displayed
   - ✅ Quality label (Excellent, Good, Fair, Poor)
   - ✅ Color-coded progress bar
   - ✅ Safety status

3. **Waste & Recycling Card**:
   - ✅ Community waste (kg) displayed
   - ✅ Recycling rate (%) displayed
   - ✅ Progress bar
   - ✅ Goal indicator (50% target)

---

### 8. Test Local Projects

**Location**: Dashboard → Environmental Data Section → "Ongoing Local Eco-Projects"

**Verify**:
1. **Category Filters**:
   - Click each category button
   - Verify projects filter correctly
   - Check "All" shows all projects

2. **Project Cards** (Should see 6 projects):
   - Manila Bay Coastal Cleanup
   - Quezon City Urban Forest
   - Pasig River Rehabilitation
   - Zero Waste Schools Program
   - Makati Green Rooftop Initiative
   - Taguig Community Composting

3. **Project Details**:
   - ✅ Status badge (Ongoing/Upcoming/Completed)
   - ✅ Category tag
   - ✅ Location
   - ✅ Participant count
   - ✅ Impact metrics (CO₂, waste, trees)

---

### 9. Mobile Responsiveness Test

**Test on Mobile or Resize Browser**:

1. **AI Waste Classifier**:
   - ✅ Camera button works on mobile
   - ✅ Upload area responsive
   - ✅ Results display properly stacked

2. **Geospatial Map**:
   - ✅ Filter buttons wrap correctly
   - ✅ Hotspot cards stack vertically
   - ✅ Statistics cards responsive

3. **Environmental Cards**:
   - ✅ Grid adapts to screen size
   - ✅ Text remains readable
   - ✅ Touch targets adequate size

---

### 10. Error Handling Test

**Test Scenarios**:

1. **AI Classifier - Large File**:
   - Try uploading >5MB image
   - **Expected**: Alert "Image size must be less than 5MB"

2. **AI Classifier - No Image**:
   - Click "Classify Waste" without image
   - **Expected**: Button does nothing (disabled state)

3. **Map - No Data**:
   - Before initializing data
   - **Expected**: Empty state message displayed

4. **Offline Mode**:
   - Disconnect internet
   - **Expected**: Loading state or error message

---

## 🐛 Common Issues & Solutions

### Issue: "Initialize Data" button doesn't appear
**Solution**: 
- Ensure you're logged in
- Check browser localStorage: `cloudDataInitialized` key
- Clear localStorage and refresh if needed

### Issue: No data showing on map
**Solution**:
- Verify data initialization completed
- Check Firebase console for documents
- Check browser console for errors

### Issue: AI Classifier not responding
**Solution**:
- Check file size (<5MB)
- Verify image format (JPG, PNG, HEIC)
- Check browser console for errors

### Issue: Real-time updates not working
**Solution**:
- Verify Firebase configuration in `.env.local`
- Check network tab for WebSocket connections
- Ensure Firestore rules allow reads

---

## 📊 Firebase Console Verification

### Check These Collections:

1. **communityStats/environmentalData**:
```
Document ID: environmentalData
Fields: airQualityIndex, waterQualityIndex, wasteGenerated, recyclingRate
```

2. **localProjects** (6 documents):
```
Fields: title, description, category, location, participants, status, impact
```

3. **pollutionHotspots** (10 documents):
```
Fields: location, type, severity, reports, description
```

4. **environmentalChanges** (5 documents):
```
Fields: location, changeType, metric, value, timestamp
```

---

## ✅ Success Criteria

All features working if:
- ✅ Data initializes without errors
- ✅ AI Waste Classifier accepts images and shows results
- ✅ Geospatial Map displays hotspots with filtering
- ✅ Environmental data shows real values from Firebase
- ✅ Real-time updates work (test by changing Firebase values)
- ✅ No console errors
- ✅ No TypeScript errors
- ✅ Mobile responsive

---

## 📞 Need Help?

1. Check browser console for errors
2. Check Firebase console for data
3. Verify `.env.local` configuration
4. Review `FEATURES.md` for detailed documentation
5. Check Network tab for failed requests

---

**Happy Testing! 🎉**
