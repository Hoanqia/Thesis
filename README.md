**E-commerce for Electronic Store**

This is a robust e-commerce platform for an electronics store, built as a thesis project. The application showcases advanced features in secure authentication, efficient inventory management, and modern payment integration, providing a complete and scalable solution for online retail.

✨ **Key Features**

- **Authentication & Authorization**: Utilizes JWT and OAuth2 for a secure user login experience. Access to resources is managed by a fine-grained Role-Based Access Control (RBAC) system.

- **Inventory Management** : Implements a highly efficient First-In, First-Out (FIFO) stock management system to ensure accurate and timely inventory updates.
 
- **Payment Gateway**: Seamlessly integrated with VNPAY for secure and reliable payment processing. Order confirmations and details are automatically sent to the customer's Gmail.

- **Product Management**: Products and their variants are flexibly managed using the Entity–Attribute–Value (EAV) model, allowing for easy addition of new product attributes without schema changes.

🛠️ **Customer Pages**
- **Cart page**
- **Checkout page**
- **Product List page**
- **Product Detail page**
- **Wishlist page**
- **Order Management page**
- **Search products**


🛠️ **Admin Pages**
- **CRUD Categories page**
- **CRUD Brand page**
- **CRUD Product and Variants management page**
- **Orders management page (Confirm - View detail of order - Update status - Delete - Payment confirmed)** 
- **CRUD Purchase Orders page**
- **Goods Received Notes (GRN) page (Confirm - view detail of GRN - Delete)**
- **Stock Lot management page (Custom - View detail of stock)**
- **User management page (Unlock/lock)**
- **Review management page (Delete - Reply)**
- **CRUD voucher page**

🛠️ **Technology Stack**
    This project is built using a modern and powerful technology stack.

- **Frontend**: TypeScript, ReactJS / Next.js , Zustand , Tailwind CSS / Sass, Axios

- **Backend**: PHP, Laravel framework, REST API

- **Database**: MySQL

🚀 **Installation & Setup**

1. Clone the repository
```bash
git clone https://github.com/Hoanqia/Thesis.git
cd Thesis
```
2. Backend (Laravel)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve &
```
 3. Frontend (ReactJS Next.js)
 ```bash
cd ../frontend
npm install
npm run dev
```
