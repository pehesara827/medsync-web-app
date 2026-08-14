# MedSync — SoftStack | HackElite 3.0

## Tech Stack Used

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React.js | Patient, Doctor, and Admin web interfaces |
| Backend | Node.js + Express.js | REST API, queue logic, business rules |
| Database / Auth / Storage / Realtime | Supabase (PostgreSQL under the hood) | Data storage, authentication, file storage (e.g. payment receipts), and real-time queue sync via Supabase Realtime |


## Architecture / System Overview

https://drive.google.com/file/d/1UPllp0K6EYZaVefJlv7jsr37mD18uEwq/view?usp=sharing 

**Short explanation:**

1. A patient opens the app. If they don't know the doctor's schedule, they can ask the AI MedBot, which queries the database and returns available slots before proceeding to booking. If they already know the schedule, they go straight to booking.
2. During booking, the patient books for themselves or a saved family member (or adds a new beneficiary, which is saved to the database for future use).
3. The patient chooses a payment method: online card payment (processed immediately, appointment marked *Booked/Paid*) or pay at reception (appointment marked *Booked/Pending*).
4. A digital QR ticket is generated on the patient's device containing appointment details.
5. On arrival, the patient presents the QR code, and reception staff scan it via the Admin Dashboard to verify the appointment and, if payment is still pending, collect cash and update the status to *Paid*.
6. The appointment status updates to *Present*, which triggers a live queue recalculation. All patients' and the doctor's screens update instantly via **Supabase Realtime** subscriptions — no page refresh needed.
7. When the doctor finishes a consultation, the system looks up the next appointment number and checks whether that patient has checked in (*Present*). If not, that patient is temporarily skipped, the next present patient is called, and the queue is recalculated. If present, the patient is called to the room and the consultation begins.

**Hardware/IoT note:** Not applicable — MedSync is a pure software system with no hardware or IoT sensor simulation. All data originates from user actions (bookings, QR scans, status updates) stored and synced through Supabase.


## Scope Delivered

| # | Feature (from proposal) | Status | Notes |
|---|---|---|---|
| 1 | Doctor Search and Appointment Booking | **Completed** | Users can search for doctors and book appointments. |
| 2 | Appointment Booking for Self or Others | **Completed** | Appointments can be booked for the user or on behalf of another person. |
| 3 | QR Code-Based Appointment Management | **Completed** | QR codes are generated and used for appointment identification and management. |
| 4 | Real-Time Queue Tracking | **Completed** | Patients can track their position in the queue in real time. |
| 5 | Live Doctor Status Updates | **Completed** | Doctor availability and current status are updated in real time. |
| 6 | Online and Physical Payment Handling | **Completed** | Supports online payment and physical payment workflows, including payment receipt handling. |
| 7 | Reception QR Scanning System | **Completed** | Reception staff can scan patient appointment QR codes for verification and management. |
| 8 | Appointment Reminder Notifications | **Completed** | Patients receive reminders and notifications related to their appointments. |
| 9 | Doctor and Appointment Management Dashboard | **Completed** | Doctors and administrators can manage appointments and related information through dedicated dashboards. |
| 10 | Multilingual Support (English/Sinhala) | **Not Implemented** | Multilingual support was not implemented in the delivered version. |
| 11 | Intelligent Hospital Information Chatbot | **Not Implemented** | The intelligent hospital information chatbot was not implemented in the delivered version. |


## Video Submission Link

