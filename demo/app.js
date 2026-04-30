// ===== HAMROH TAXI — FULL DEMO APPLICATION =====
const app = {
  // ===== API CLIENT =====
  async api(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    try {
      const res = await fetch(this.apiBase + endpoint, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'API error');
      return data;
    } catch (err) {
      this.toast(err.message, 'error');
      throw err;
    }
  },

  // ===== SOCKET.IO =====
  initSocket() {
    if (typeof io === 'undefined') return;
    this.socket = io('http://localhost:3000');
    this.socket.on('seat-changed', (data) => {
      this.toast(`O'rindiq ${data.seats.join(', ')} band qilindi`, 'info');
      if (this.state.currentTripId === data.trip_id) {
        this.renderSeatPage();
      }
    });
    this.socket.on('trip-updated', (data) => {
      if (this.state.currentPage === 'passenger') {
        this.searchTripsFromInput();
      }
    });
    this.socket.on('parcel-updated', (data) => {
      this.toast('Pochta holati yangilandi!', 'info');
      if (this.state.currentPage === 'parcel') this.renderMyParcels();
    });
  },

  // ===== API METHODS =====
  async register(phone, name, role) {
    const res = await this.api('/auth/register', 'POST', { phone, full_name: name, role });
    return res.otp;
  },

  async checkPhoneApi(phone) {
    const res = await this.api('/auth/check-phone', 'POST', { phone });
    return res;
  },

  async verifyOTPApi(phone, otp) {
    const res = await this.api('/auth/verify', 'POST', { phone, otp });
    this.token = res.token;
    this.state.user = res.user;
    localStorage.setItem('hamroh_token', this.token);
    localStorage.setItem('hamroh_user', JSON.stringify(res.user));
    return res;
  },

  async searchTrips(from, to) {
    const res = await this.api(`/passenger/trips?from=${from}&to=${to}`);
    this.state.trips = res;
    return res;
  },

  async bookTrip(tripId, seats) {
    const res = await this.api('/passenger/book', 'POST', { trip_id: tripId, selected_seats: JSON.stringify(seats) });
    return res;
  },

  async createParcel(data) {
    const res = await this.api('/parcel', 'POST', data);
    return res;
  },

  async getMyParcels() {
    const res = await this.api('/parcel/my');
    this.state.parcels = res;
    return res;
  },

  async getDriverParcels() {
    const res = await this.api('/driver/parcels');
    return res;
  },

  async acceptParcel(parcelId) {
    const res = await this.api(`/driver/parcels/${parcelId}/accept`, 'PUT', {});
    return res;
  },

  async updateParcelStatus(parcelId, status) {
    const res = await this.api(`/driver/parcels/${parcelId}/status`, 'PUT', { parcel_status: status });
    return res;
  },

  async getAdminStats() {
    const res = await this.api('/admin/dashboard');
    return res;
  },

  async getAdminParcels() {
    const res = await this.api('/admin/parcels');
    return res;
  },

  async createDriverTrip(data) {
    const res = await this.api('/driver/trips', 'POST', data);
    return res;
  },

  async getDriverTrips() {
    const res = await this.api('/driver/trips');
    return res;
  },

  async updateProfile(data) {
    const res = await this.api('/auth/me', 'PUT', data);
    this.state.user = res.user;
    localStorage.setItem('hamroh_user', JSON.stringify(res.user));
    return res;
  },

  async changePassword(data) {
    const res = await this.api('/auth/password', 'PUT', data);
    return res;
  },

  // ===== STATE =====
  state: {
    lang: 'uz',
    theme: 'light',
    user: JSON.parse(localStorage.getItem('hamroh_user')) || null,
    role: 'passenger',
    currentPage: 'landing',
    otpCode: '',
    trips: [],
    bookings: [],
    selectedSeats: [],
    currentTripId: null,
    selectedPayment: 'cash',
    lostItems: [],
    parcels: [],
    currentMode: 'taxi',
  },

  // ===== CONFIG =====
  apiBase: 'http://localhost:3000/api',
  token: localStorage.getItem('hamroh_token') || null,

  // ===== CITIES =====
  cities: ['Toshkent','Samarqand','Buxoro','Xiva','Andijon',"Farg'ona",'Namangan',"Qo'qon",'Nukus','Termiz','Qarshi','Navoiy','Jizzax','Guliston','Angren','Denov','Marg\'ilon','Chirchiq','Olmaota','Shahrisabz'],

  // ===== TRANSLATIONS =====
  t: {
    uz: {
      'auth.login':'Kirish','auth.register':"Ro'yxatdan o'tish",'auth.welcome':"Hamroh Taxi'ga xush kelibsiz!",'auth.sendOTP':'SMS kod yuborish','auth.verifyOTP':'Tasdiqlash','auth.enterOTP':'SMS kelgan kodni kiriting','auth.resendOTP':'Kodni qayta yuborish','auth.logout':'Chiqish','auth.firstName':'Ism','auth.phonePlaceholder':'+998 90 123 45 67',
      'roles.passenger':"Yo'lovchi",'roles.driver':'Haydovchi','roles.admin':'Boshqaruvchi','roles.selectRole':'Kim sifatida kirmoqchisiz?','roles.passengerDesc':'Yo\'lga chiqmoqchiman','roles.driverDesc':'Yo\'lovchi tashimoqchiman',
      'passenger.title':"Yo'lovchi",'passenger.searchTrips':'Reys qidirish','passenger.whereTo':'Qayerga borasiz?','passenger.from':'Qayerdan','passenger.to':'Qayerga','passenger.date':'Qachon','passenger.search':'Qidirish','passenger.noTrips':'Afsuski, bunday reys topilmadi','passenger.selectSeat':'O\'rindiq tanlang','passenger.bookNow':'Bron qilish','passenger.bookingConfirmed':'Broningiz tasdiqlandi!','passenger.myTrips':'Mening reyslarim','passenger.tripHistory':'O\'tgan reyslar','passenger.noUpcoming':'Kelgusi reyslaringiz yo\'q','passenger.searchNew':'Yangi reys qidiring',
      'driver.title':'Haydovchi','driver.registerDriver':'Haydovchi bo\'lish','driver.createTrip':'Yangi reys yaratish','driver.departureCity':'Qayerdan jo\'naysiz','driver.destinationCity':'Qayerga borasiz','driver.departureTime':'Jo\'nash vaqti','driver.arrivalTime':'Taxminiy yetib kelish','driver.carModel':'Mashina modeli','driver.carSeats':'Necha o\'rindiq','driver.setPrice':'Bir o\'rindiq narxi (so\'m)','driver.carColor':'Mashina rangi','driver.myTrips':'Mening reyslarim','driver.earnings':'Daromad','driver.noTrips':'Hali reys yaratmadingiz','driver.createFirst':'Birinchi reysingizni yaratish',
      'admin.title':'Boshqaruv paneli','admin.drivers':'Haydovchilar','admin.rides':'Reyslar','admin.users':'Foydalanuvchilar','admin.totalUsers':'Jami odamlar','admin.totalDrivers':'Jami haydovchilar','admin.totalRides':'Jami reyslar','admin.revenue':'Tushum',
      'seats.title':'O\'rindiq tanlang','seats.available':'Bo\'sh','seats.selected':'Siz tanladingiz','seats.occupied':'Band','seats.bookingInProgress':'Kimdir bron qilmoqda','seats.driver':'Haydovchi','seats.howToSelect':'Bo\'sh o\'rindiqni bosing va tanlang',
      'booking.title':'Bron','booking.price':'Narxi','booking.seats':'O\'rindiqlar','booking.total':'Jami','booking.paymentMethod':'To\'lov usuli','booking.cash':'Naqd pul','booking.card':'Plastik karta','booking.online':'Onlayn (Click/Payme)','booking.confirm':'Bronni tasdiqlash',
      'filters.minPrice':'Narx (dan)','filters.maxPrice':'Narx (gacha)',
      'home.heroTitle':'Shaharlararo sayohat oson bo\'ldi','home.heroDesc':'O\'rindiq tanlang, to\'lov qiling va yo\'lga chiqing. Hamroh Taxi — ishonchli sayohat hamrohi.','home.searchBtn':'Reys qidirish','home.driverBtn':'Haydovchi bo\'lish','home.howItWorks':'Qanday ishlaydi?','home.features':'Nima uchun Hamroh Taxi?',
    },
    ru: {
      'auth.login':'Вход','auth.register':'Регистрация','auth.welcome':'Добро пожаловать в Hamroh Taxi!','auth.sendOTP':'Отправить SMS код','auth.verifyOTP':'Подтвердить','auth.enterOTP':'Введите код из SMS','auth.resendOTP':'Отправить код снова','auth.logout':'Выход','auth.firstName':'Имя','auth.phonePlaceholder':'+998 90 123 45 67',
      'roles.passenger':'Пассажир','roles.driver':'Водитель','roles.admin':'Администратор','roles.selectRole':'Как вы хотите войти?','roles.passengerDesc':'Хочу поехать','roles.driverDesc':'Хочу везти',
      'passenger.title':'Пассажир','passenger.searchTrips':'Поиск рейсов','passenger.whereTo':'Куда едете?','passenger.from':'Откуда','passenger.to':'Куда','passenger.date':'Когда','passenger.search':'Искать','passenger.noTrips':'К сожалению, рейсов не найдено','passenger.selectSeat':'Выберите место','passenger.bookNow':'Забронировать','passenger.bookingConfirmed':'Бронирование подтверждено!','passenger.myTrips':'Мои рейсы','passenger.tripHistory':'История','passenger.noUpcoming':'Нет предстоящих рейсов','passenger.searchNew':'Найти новый рейс',
      'driver.title':'Водитель','driver.registerDriver':'Стать водителем','driver.createTrip':'Создать рейс','driver.departureCity':'Откуда выезжаете','driver.destinationCity':'Куда едете','driver.departureTime':'Время отправления','driver.arrivalTime':'Примерное прибытие','driver.carModel':'Марка авто','driver.carSeats':'Количество мест','driver.setPrice':'Цена за место (сум)','driver.carColor':'Цвет авто','driver.myTrips':'Мои рейсы','driver.earnings':'Доход','driver.noTrips':'Вы ещё не создали рейс','driver.createFirst':'Создать первый рейс',
      'admin.title':'Панель управления','admin.drivers':'Водители','admin.rides':'Рейсы','admin.users':'Пользователи','admin.totalUsers':'Всего людей','admin.totalDrivers':'Всего водителей','admin.totalRides':'Всего рейсов','admin.revenue':'Доход',
      'seats.title':'Выберите место','seats.available':'Свободно','seats.selected':'Вы выбрали','seats.occupied':'Занято','seats.bookingInProgress':'Кто-то бронирует','seats.driver':'Водитель','seats.howToSelect':'Нажмите на свободное место',
      'booking.title':'Бронирование','booking.price':'Цена','booking.seats':'Места','booking.total':'Итого','booking.paymentMethod':'Способ оплаты','booking.cash':'Наличные','booking.card':'Пластиковая карта','booking.online':'Онлайн (Click/Payme)','booking.confirm':'Подтвердить бронь',
      'filters.minPrice':'Цена (от)','filters.maxPrice':'Цена (до)',
      'home.heroTitle':'Межгородские поездки стали проще','home.heroDesc':'Выберите место, оплатите и отправляйтесь. Hamroh Taxi — надёжный спутник.','home.searchBtn':'Поиск рейсов','home.driverBtn':'Стать водителем','home.howItWorks':'Как это работает?','home.features':'Почему Hamroh Taxi?',
    },
    en: {
      'auth.login':'Login','auth.register':'Register','auth.welcome':'Welcome to Hamroh Taxi!','auth.sendOTP':'Send SMS code','auth.verifyOTP':'Verify','auth.enterOTP':'Enter the code from SMS','auth.resendOTP':'Resend code','auth.logout':'Logout','auth.firstName':'Name','auth.phonePlaceholder':'+998 90 123 45 67',
      'roles.passenger':'Passenger','roles.driver':'Driver','roles.admin':'Admin','roles.selectRole':'How do you want to log in?','roles.passengerDesc':'I want to travel','roles.driverDesc':'I want to drive',
      'passenger.title':'Passenger','passenger.searchTrips':'Search trips','passenger.whereTo':'Where are you going?','passenger.from':'From','passenger.to':'To','passenger.date':'When','passenger.search':'Search','passenger.noTrips':'No trips found','passenger.selectSeat':'Select seat','passenger.bookNow':'Book now','passenger.bookingConfirmed':'Booking confirmed!','passenger.myTrips':'My trips','passenger.tripHistory':'History','passenger.noUpcoming':'No upcoming trips','passenger.searchNew':'Search new trip',
      'driver.title':'Driver','driver.registerDriver':'Become a driver','driver.createTrip':'Create trip','driver.departureCity':'Departure city','driver.destinationCity':'Destination','driver.departureTime':'Departure time','driver.arrivalTime':'Estimated arrival','driver.carModel':'Car model','driver.carSeats':'Number of seats','driver.setPrice':'Price per seat (sum)','driver.carColor':'Car color','driver.myTrips':'My trips','driver.earnings':'Earnings','driver.noTrips':'No trips created yet','driver.createFirst':'Create your first trip',
      'admin.title':'Admin Panel','admin.drivers':'Drivers','admin.rides':'Rides','admin.users':'Users','admin.totalUsers':'Total users','admin.totalDrivers':'Total drivers','admin.totalRides':'Total rides','admin.revenue':'Revenue',
      'seats.title':'Select your seat','seats.available':'Available','seats.selected':'You selected','seats.occupied':'Occupied','seats.bookingInProgress':'Someone is booking','seats.driver':'Driver','seats.howToSelect':'Click an available seat',
      'booking.title':'Booking','booking.price':'Price','booking.seats':'Seats','booking.total':'Total','booking.paymentMethod':'Payment method','booking.cash':'Cash','booking.card':'Card','booking.online':'Online (Click/Payme)','booking.confirm':'Confirm booking',
      'filters.minPrice':'Min price','filters.maxPrice':'Max price',
      'home.heroTitle':'Intercity travel made easy','home.heroDesc':'Choose your seat, pay and go. Hamroh Taxi — your reliable travel companion.','home.searchBtn':'Search trips','home.driverBtn':'Become a driver','home.howItWorks':'How it works?','home.features':'Why Hamroh Taxi?',
    }
  },

  // ===== TRANSLATE HELPER =====
  tr(key) { return (this.t[this.state.lang] && this.t[this.state.lang][key]) || key; },

  // ===== INIT =====
  init() {
    this.clearDemoData();
    this.loadState();
    this.renderLangSwitcher();
    this.renderCitySelects();
    this.renderLanding();
    this.initSocket();
    this.applyTheme();
    this.applyLang();
    this.updateNav();
    this.navigate(this.state.currentPage);
  },

  clearDemoData() {
    // Clear any old demo data from localStorage
    try {
      const state = localStorage.getItem('hamroh_state');
      if (state) {
        const parsed = JSON.parse(state);
        // Clear demo trips (string IDs like 't1', 't2' or old format)
        if (parsed.trips) {
          parsed.trips = parsed.trips.filter(t => {
            // Keep only real backend trips (numeric IDs)
            return typeof t.id === 'number' || (typeof t.id === 'string' && !t.id.startsWith('t'));
          });
        }
        // Clear demo bookings
        if (parsed.bookings) {
          parsed.bookings = parsed.bookings.filter(b => {
            return typeof b.tripId === 'number' || (typeof b.tripId === 'string' && !b.tripId.startsWith('t'));
          });
        }
        localStorage.setItem('hamroh_state', JSON.stringify(parsed));
      }
    } catch(e) {}
  },

  loadState() {
    try {
      const s = localStorage.getItem('hamroh_state');
      if (s) { const p = JSON.parse(s); Object.assign(this.state, p); }
    } catch(e) {}
  },

  saveState() {
    try { localStorage.setItem('hamroh_state', JSON.stringify(this.state)); } catch(e) {}
  },

  // ===== NAVIGATION =====
  navigate(page) {
    if (['passenger','driver','seat','booking','parcel'].includes(page) && !this.state.user) {
      this.state.currentPage = 'login';
      this.resetLoginForm();
      this.showPage('login');
      this.toast(this.tr('auth.login'), 'info');
      return;
    }
    if (page === 'admin' && this.state.user?.role !== 'admin') {
      this.toast('Admin paneliga kirish uchun admin sifatida kiring', 'error');
      return;
    }
    this.state.currentPage = page;
    this.showPage(page);
    this.saveState();
    if (page === 'passenger') this.renderPassenger();
    if (page === 'driver') this.renderDriver();
    if (page === 'seat') this.renderSeatPage();
    if (page === 'booking') this.renderBookingPage();
    if (page === 'admin') this.renderAdmin();
    if (page === 'parcel') this.renderParcelPage();
    if (page === 'profile') this.renderProfile();
    if (page === 'login') this.resetLoginForm();
  },

  resetLoginForm() {
    // Reset to step 0 (phone input)
    document.getElementById('auth-step-0').classList.remove('hidden');
    document.getElementById('auth-step-1').classList.add('hidden');
    document.getElementById('auth-step-2').classList.add('hidden');
    document.getElementById('phone-check-status').textContent = '';
    document.getElementById('input-phone').value = '';
    document.getElementById('input-name').value = '';
    this.state.tempPhone = null;
    this.state.tempUser = null;
    this.state.isExistingUser = false;
  },

  showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  },

  // ===== LANGUAGE =====
  setLang(lang) {
    this.state.lang = lang;
    this.saveState();
    this.applyLang();
    this.renderLangSwitcher();
    this.renderLanding();
  },

  applyLang() {
    document.querySelectorAll('[data-t]').forEach(el => {
      const key = el.getAttribute('data-t');
      const text = this.tr(key);
      if (text && text !== key) el.textContent = text;
    });
    document.documentElement.lang = this.state.lang;
  },

  renderLangSwitcher() {
    const container = document.getElementById('lang-switcher');
    container.innerHTML = ['uz','ru','en'].map(l =>
      `<button class="lang-btn ${this.state.lang===l?'active':''}" onclick="app.setLang('${l}')">${l==='uz'?"O'z":l==='ru'?'Ру':'En'}</button>`
    ).join('');
  },

  // ===== THEME =====
  toggleTheme() {
    this.state.theme = this.state.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    this.saveState();
  },

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.state.theme);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = this.state.theme === 'dark' ? '☀️' : '🌙';
  },

  // ===== GO BACK =====
  goBack() {
    if (this.state.user?.role === 'passenger') this.navigate('passenger');
    else if (this.state.user?.role === 'driver') this.navigate('driver');
    else this.navigate('landing');
  },

  // ===== MODE SWITCHER =====
  switchMode(mode) {
    this.state.currentMode = mode;
    document.getElementById('mode-taxi').classList.toggle('active', mode === 'taxi');
    document.getElementById('mode-parcel').classList.toggle('active', mode === 'parcel');
    document.getElementById('hero-taxi').classList.toggle('hidden', mode !== 'taxi');
    document.getElementById('hero-parcel').classList.toggle('hidden', mode !== 'parcel');
    document.getElementById('steps-section').classList.toggle('hidden', mode !== 'taxi');
    document.getElementById('parcel-steps-section').classList.toggle('hidden', mode !== 'parcel');
    document.getElementById('features-section').classList.toggle('hidden', mode !== 'taxi');
  },

  // ===== PARCEL =====
  startParcelFromHero() {
    const from = document.getElementById('parcel-hero-from').value.trim();
    const to = document.getElementById('parcel-hero-to').value.trim();
    if (!this.state.user) { this.navigate('login'); return; }
    document.getElementById('parcel-from').value = from;
    document.getElementById('parcel-to').value = to;
    this.navigate('parcel');
  },

  switchParcelTab(tab) {
    document.querySelectorAll('#page-parcel .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-parcel .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-parcel-' + tab).classList.add('active');
    event.target.classList.add('active');
    if (tab === 'myorders') this.renderMyParcels();
    if (tab === 'tracking') document.getElementById('tracking-result').innerHTML = '';
  },

  createParcelOrder() {
    const from = document.getElementById('parcel-from').value.trim();
    const to = document.getElementById('parcel-to').value.trim();
    const type = document.getElementById('parcel-type').value;
    const weight = parseFloat(document.getElementById('parcel-weight').value) || 1;
    const size = document.getElementById('parcel-size').value;
    const time = document.getElementById('parcel-time').value;
    const desc = document.getElementById('parcel-desc').value.trim();
    if (!from || !to) { this.toast('Manzillarni kiriting', 'error'); return; }
    
    const data = {
      pickup_location: from,
      delivery_location: to,
      parcel_type: type,
      parcel_weight: weight,
      parcel_size: size,
      description: desc,
      delivery_time: time
    };
    
    this.createParcel(data).then(res => {
      this.toast('✅ Buyurtma yuborildi! Narx: ' + res.price.toLocaleString() + " so'm", 'success');
      this.getMyParcels().then(() => {
        this.renderMyParcels();
        this.switchParcelTabManually('myorders');
      });
    }).catch(err => {
      // Fallback to demo mode
      const sizeMultiplier = {small:1,medium:1.5,large:2.5}[size] || 1.5;
      const basePrice = 15000;
      const price = Math.ceil(basePrice * weight * sizeMultiplier);
      const parcel = {
        id: 'p_' + Date.now(),
        senderId: this.state.user.id,
        senderName: this.state.user.name,
        senderPhone: this.state.user.phone,
        from, to, type, weight, size, time, desc,
        price,
        status: 'pending',
        driverId: null,
        createdAt: new Date().toISOString(),
      };
      this.state.parcels.push(parcel);
      this.saveState();
      this.toast('✅ Buyurtma yuborildi! Narx: ' + price.toLocaleString() + " so'm", 'success');
      this.renderMyParcels();
      this.switchParcelTabManually('myorders');
    });
  },

  calcParcelPrice() {
    const weight = parseFloat(document.getElementById('parcel-weight').value) || 1;
    const size = document.getElementById('parcel-size').value;
    const sizeMultiplier = {small:1,medium:1.5,large:2.5}[size] || 1.5;
    const basePrice = 15000;
    const price = Math.ceil(basePrice * weight * sizeMultiplier);
    const el = document.getElementById('parcel-price-estimate');
    if (el) el.textContent = `💰 Taxminiy narx: ${price.toLocaleString()} so'm`;
  },

  switchParcelTabManually(tab) {
    document.querySelectorAll('#page-parcel .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-parcel .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-parcel-' + tab).classList.add('active');
  },

  renderMyParcels() {
    this.getMyParcels().then(parcels => {
      const list = document.getElementById('parcel-orders-list');
      const empty = document.getElementById('parcel-orders-empty');
      if (parcels.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        list.innerHTML = parcels.map(p => this.renderParcelCard(p, 'sender')).join('');
      }
      this.renderCitySelects();
    }).catch(err => {
      // Fallback to local state
      const myParcels = this.state.parcels.filter(p => p.senderId === this.state.user?.id);
      const list = document.getElementById('parcel-orders-list');
      const empty = document.getElementById('parcel-orders-empty');
      if (myParcels.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        list.innerHTML = myParcels.map(p => this.renderParcelCard(p, 'sender')).join('');
      }
      this.renderCitySelects();
    });
  },

  renderParcelCard(parcel, view) {
    const statusMap = {pending:{label:'Kutilmoqda',badge:'badge-danger',icon:'⏳'},accepted:{label:'Qabul qilindi',badge:'badge-warning',icon:'🚗'},indelivery:{label:'Yo\'lda',badge:'badge-info',icon:'📦'},delivered:{label:'Yetkazildi',badge:'badge-success',icon:'✅'}};
    const s = statusMap[parcel.status] || statusMap.pending;
    let actions = '';
    if (view === 'driver' && parcel.status === 'pending') {
      actions = `<button class="btn btn-success btn-sm" onclick="app.acceptParcel('${parcel.id}')">✅ Qabul qilish</button>`;
    }
    if (view === 'driver' && parcel.status === 'accepted') {
      actions = `<button class="btn btn-primary btn-sm" onclick="app.updateParcelStatus('${parcel.id}','indelivery')">📦 Yo\'lga chiqish</button>`;
    }
    if (view === 'driver' && parcel.status === 'indelivery') {
      actions = `<button class="btn btn-success btn-sm" onclick="app.updateParcelStatus('${parcel.id}','delivered')">✅ Yetkazildi</button>`;
    }
    return `
      <div class="lost-item-card">
        <div class="lost-item-header">
          <strong>📦 ${parcel.from} → ${parcel.to}</strong>
          <span class="admin-badge ${s.badge}">${s.icon} ${s.label}</span>
        </div>
        <div class="lost-item-body">
          <p>📄 Turi: ${parcel.type} | ⚖️ ${parcel.weight}kg | 📦 ${parcel.size}</p>
          <p>💰 Narx: ${parcel.price.toLocaleString()} so'm</p>
          ${parcel.desc ? '<p>📝 ' + parcel.desc + '</p>' : ''}
          <p>👤 Yuboruvchi: ${parcel.senderName}</p>
        </div>
        ${actions ? '<div class="lost-item-actions">' + actions + '</div>' : ''}
      </div>`;
  },

  trackParcel() {
    const trackingId = document.getElementById('tracking-id-input').value.trim();
    const parcel = this.state.parcels.find(p => p.id === trackingId);
    const result = document.getElementById('tracking-result');
    if (!parcel) {
      result.innerHTML = '<p style="color:var(--danger)">Buyurtma topilmadi</p>';
      return;
    }
    const statusMap = {pending:'Kutilmoqda',accepted:'Qabul qilindi',indelivery:'Yo\'lda',delivered:'Yetkazildi'};
    result.innerHTML = `
      <div class="lost-item-card">
        <div class="lost-item-header"><strong>📦 ${parcel.from} → ${parcel.to}</strong></div>
        <div class="lost-item-body">
          <p>📄 Turi: ${parcel.type} | ⚖️ ${parcel.weight}kg</p>
          <p>💰 Narx: ${parcel.price.toLocaleString()} so'm</p>
          <p>📊 Holat: <strong>${statusMap[parcel.status]}</strong></p>
          <p>📅 Sana: ${new Date(parcel.createdAt).toLocaleString('uz')}</p>
        </div>
      </div>`;
  },

  acceptParcel(parcelId) {
    this.acceptParcelApi(parcelId).then(res => {
      this.toast('✅ Buyurtma qabul qilindi', 'success');
      this.getDriverParcels().then(() => this.renderDriverParcels());
    }).catch(err => {
      // Fallback to demo mode
      const parcel = this.state.parcels.find(p => p.id === parcelId);
      if (parcel) {
        parcel.status = 'accepted';
        parcel.driverId = this.state.user.id;
        this.saveState();
        this.toast('✅ Buyurtma qabul qilindi', 'success');
        this.renderDriverParcels();
      }
    });
  },

  updateParcelStatus(parcelId, newStatus) {
    this.updateParcelStatusApi(parcelId, newStatus).then(res => {
      const labels = {indelivery:'Yo\'lga chiqildi',delivered:'Yetkazildi'};
      this.toast('✅ ' + labels[newStatus], 'success');
      this.getDriverParcels().then(() => this.renderDriverParcels());
    }).catch(err => {
      // Fallback to demo mode
      const parcel = this.state.parcels.find(p => p.id === parcelId);
      if (parcel) {
        parcel.status = newStatus;
        this.saveState();
        const labels = {indelivery:'Yo\'lga chiqildi',delivered:'Yetkazildi'};
        this.toast('✅ ' + labels[newStatus], 'success');
        this.renderDriverParcels();
      }
    });
  },

  renderDriverParcels() {
    this.getDriverParcels().then(parcels => {
      const list = document.getElementById('driver-parcels-list');
      const empty = document.getElementById('driver-parcels-empty');
      if (parcels.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        list.innerHTML = parcels.map(p => this.renderParcelCard(p, 'driver')).join('');
      }
    }).catch(err => {
      // Fallback to local state
      const available = this.state.parcels.filter(p => p.status === 'pending');
      const myParcels = this.state.parcels.filter(p => p.driverId === this.state.user?.id && p.status !== 'delivered');
      const list = document.getElementById('driver-parcels-list');
      const empty = document.getElementById('driver-parcels-empty');
      const all = [...available, ...myParcels];
      if (all.length === 0) {
        list.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        list.innerHTML = all.map(p => this.renderParcelCard(p, 'driver')).join('');
      }
    });
  },

  // ===== NAV UPDATE =====
  updateNav() {
    const user = this.state.user;
    document.getElementById('btn-login').classList.toggle('hidden', !!user);
    document.getElementById('btn-register').classList.toggle('hidden', !!user);
    document.getElementById('btn-logout').classList.toggle('hidden', !user);
    const links = document.getElementById('nav-links');
    if (user) {
      let html = '';
      if (user.role === 'passenger') html += `<a onclick="app.navigate('passenger')">${this.tr('roles.passenger')}</a>`;
      if (user.role === 'driver') html += `<a onclick="app.navigate('driver')">${this.tr('roles.driver')}</a>`;
      if (user.role === 'admin') html += `<a onclick="app.navigate('admin')">${this.tr('roles.admin')}</a>`;
      html += `<a onclick="app.navigate('profile')">⚙️ Profil</a>`;
      html += `<a onclick="app.logout()" class="mobile-logout">🚪 Chiqish</a>`;
      links.innerHTML = html;
    } else {
      links.innerHTML = `<a onclick="app.navigate('login')">🔐 Kirish / Ro'yxatdan o'tish</a>`;
    }
  },

  toggleMobileMenu() {
    const links = document.getElementById('nav-links');
    links.classList.toggle('mobile-open');
  },

  // ===== CITY SELECTS =====
  renderParcelPage() {
    if (!this.state.user) return;
    document.getElementById('parcel-greeting').textContent = `👋 ${this.state.user.name}`;
    this.renderMyParcels();
    this.calcParcelPrice();
  },

  renderCitySelects() {
    const lists = ['cities-list','cities-list2','cities-list3','cities-list4'];
    lists.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = this.cities.map(c => `<option value="${c}">`).join('');
    });
  },

  // ===== LANDING PAGE =====
  renderLanding() {
    // Popular routes - empty, will be filled from backend
    document.getElementById('popular-routes').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <p>Reyslarni qidirish uchun tizimga kiring</p>
        <button class="btn btn-primary" onclick="app.navigate('login')" style="margin-top:16px">Kirish / Ro'yxatdan o'tish</button>
      </div>
    `;

    // Steps
    const steps = [
      {n:'1',t:'Manzil tanlang',d:'Qayerdan va qayerga borishni tanlang'},
      {n:'2',t:'O\'rindiq tanlang',d:'Mashinada bo\'sh o\'rindiqni tanlang'},
      {n:'3',t:'To\'lov qiling',d:'Naqd yoki karta orqali to\'lang'},
      {n:'4',t:'Yo\'lga chiqing',d:'Haydovchi keladi va yo\'lga chiqasiz'},
    ];
    document.getElementById('steps-grid').innerHTML = steps.map(s => `
      <div class="step-card"><div class="step-num">${s.n}</div><h3>${s.t}</h3><p>${s.d}</p></div>
    `).join('');

    // Features
    const features = [
      {i:'🪑',t:'O\'rindiq tanlash',d:'Mashinada qaysi o\'rindiq bo\'shligini ko\'ring va tanlang'},
      {i:'🛡️',t:'Ishonchli haydovchilar',d:'Barcha haydovchilar tekshirilgan va tasdiqlangan'},
      {i:'💳',t:'Oson to\'lov',d:'Naqd, karta yoki onlayn to\'lang'},
      {i:'⚡',t:'Real vaqtda',d:'O\'rindiq band bo\'lsa darhol ko\'rinadi'},
    ];
    document.getElementById('features-grid').innerHTML = features.map(f => `
      <div class="feature-card"><div class="feature-icon">${f.i}</div><h3>${f.t}</h3><p>${f.d}</p></div>
    `).join('');
  },

  quickSearch(from, to) {
    if (!this.state.user) { this.navigate('login'); return; }
    document.getElementById('search-from').value = from;
    document.getElementById('search-to').value = to;
    this.navigate('passenger');
    this.searchTripsFromInput();
  },

  searchFromHero() {
    const from = document.getElementById('hero-from').value.trim();
    const to = document.getElementById('hero-to').value.trim();
    if (!this.state.user) { this.navigate('login'); return; }
    document.getElementById('search-from').value = from;
    document.getElementById('search-to').value = to;
    this.navigate('passenger');
    this.searchTripsFromInput();
  },

  // ===== AUTH =====
  selectRole(role) {
    this.state.role = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('active', b.dataset.role === role));
    const adminField = document.getElementById('admin-password-field');
    if (role === 'admin') {
      adminField.classList.remove('hidden');
    } else {
      adminField.classList.add('hidden');
    }
  },

  checkPhone() {
    const phoneRaw = document.getElementById('input-phone').value.replace(/\D/g, '');
    const phone = '+998' + phoneRaw;
    const statusEl = document.getElementById('phone-check-status');

    if (phoneRaw.length < 9) {
      statusEl.textContent = '❌ Telefon raqamni to\'g\'ri kiriting';
      statusEl.style.color = 'var(--danger)';
      return;
    }

    statusEl.textContent = '⏳ Tekshirilmoqda...';
    statusEl.style.color = 'var(--text2)';

    this.checkPhoneApi(phone).then(res => {
      // Save phone for later use
      this.state.tempPhone = phone;

      if (res.exists && res.user) {
        // Existing user - show login flow with pre-filled name
        document.getElementById('existing-user-banner').classList.remove('hidden');
        document.getElementById('input-name').value = res.user.full_name || '';
        document.getElementById('role-select-section').classList.add('hidden');
        this.state.role = res.user.role;
        this.state.isExistingUser = true;
        this.state.tempUser = res.user;
        statusEl.textContent = '✅ Siz avval ro\'yxatdan o\'tgansiz! Kirish mumkin.';
        statusEl.style.color = 'var(--success)';
      } else {
        // New user - show registration flow
        document.getElementById('existing-user-banner').classList.add('hidden');
        document.getElementById('input-name').value = '';
        document.getElementById('role-select-section').classList.remove('hidden');
        this.state.isExistingUser = false;
        this.state.tempUser = null;
        statusEl.textContent = '✅ Yangi foydalanuvchi. Ro\'yxatdan o\'tish.';
        statusEl.style.color = 'var(--success)';
      }

      // Show step 1 (name/role form)
      setTimeout(() => {
        document.getElementById('auth-step-0').classList.add('hidden');
        document.getElementById('auth-step-1').classList.remove('hidden');
      }, 500);
    }).catch(err => {
      // Fallback - assume new user
      this.state.tempPhone = phone;
      this.state.isExistingUser = false;
      document.getElementById('auth-step-0').classList.add('hidden');
      document.getElementById('auth-step-1').classList.remove('hidden');
      statusEl.textContent = '';
    });
  },

  sendOTP() {
    const name = document.getElementById('input-name').value.trim();
    const phoneRaw = document.getElementById('input-phone').value.replace(/\D/g, '');
    const phone = '+998' + phoneRaw;

    if (!name) { this.toast('Ismingizni kiriting', 'error'); return; }
    if (phoneRaw.length < 9) { this.toast('Telefon raqamni to\'g\'ri kiriting', 'error'); return; }
    if (this.state.role === 'admin') {
      const adminPass = document.getElementById('input-admin-password').value;
      if (adminPass !== 'hamroh2024') { this.toast('Admin paroli noto\'g\'ri!', 'error'); return; }
    }

    // Call backend API
    this.register(phone, name, this.state.role).then(otp => {
      this.state.otpCode = otp;
      document.getElementById('otp-code-show').textContent = otp;
      document.getElementById('auth-step-1').classList.add('hidden');
      document.getElementById('auth-step-2').classList.remove('hidden');
      this.toast('SMS kod yuborildi: ' + otp, 'info');
      setTimeout(() => { const d = document.querySelectorAll('.otp-digit'); if(d[0]) d[0].focus(); }, 100);
    }).catch(err => {
      // Fallback to demo mode if backend fails
      this.state.otpCode = String(Math.floor(1000 + Math.random() * 9000));
      document.getElementById('otp-code-show').textContent = this.state.otpCode;
      document.getElementById('auth-step-1').classList.add('hidden');
      document.getElementById('auth-step-2').classList.remove('hidden');
      this.toast('SMS kod yuborildi: ' + this.state.otpCode, 'info');
      setTimeout(() => { const d = document.querySelectorAll('.otp-digit'); if(d[0]) d[0].focus(); }, 100);
    });
  },

  otpInput(el, idx) {
    if (el.value.length === 1) {
      const digits = document.querySelectorAll('.otp-digit');
      if (idx < 3) digits[idx + 1].focus();
    }
  },

  verifyOTP() {
    const phoneRaw = document.getElementById('input-phone').value.replace(/\D/g, '');
    const phone = '+998' + phoneRaw;
    const otp = Array.from(document.querySelectorAll('.otp-digit')).map(d => d.value).join('');
    if (otp.length !== 4) { this.toast('4 xonali kod kiriting', 'error'); return; }
    
    // Call backend API
    this.verifyOTPApi(phone, otp).then(res => {
      this.state.user = res.user;
      this.saveState();
      this.updateNav();
      this.toast('', 'success');
      if (this.state.user.role === 'passenger') this.navigate('passenger');
      else if (this.state.user.role === 'driver') this.navigate('driver');
      else this.navigate('admin');
    }).catch(err => {
      // Fallback to demo mode
      if (otp !== this.state.otpCode) { this.toast('Noto\'g\'ri kod', 'error'); return; }
      this.state.user = { id: Date.now(), name: document.getElementById('input-name').value, phone, role: this.state.role };
      this.saveState();
      this.updateNav();
      this.toast('', 'success');
      if (this.state.user.role === 'passenger') this.navigate('passenger');
      else if (this.state.user.role === 'driver') this.navigate('driver');
      else this.navigate('admin');
    });
  },

  resendOTP() {
    this.state.otpCode = String(Math.floor(1000 + Math.random() * 9000));
    document.getElementById('otp-code-show').textContent = this.state.otpCode;
    this.toast('Yangi kod: ' + this.state.otpCode, 'info');
  },

  logout() {
    this.state.user = null;
    this.state.bookings = [];
    this.state.selectedSeats = [];
    this.state.trips = [];
    this.state.parcels = [];
    this.state.lostItems = [];
    this.token = null;
    localStorage.removeItem('hamroh_token');
    localStorage.removeItem('hamroh_user');
    localStorage.removeItem('hamroh_state');
    this.saveState();
    this.updateNav();
    this.navigate('landing');
    this.toast('Tizimdan chiqdingiz', 'info');
  },

  // Clear all data (for debugging)
  clearAllData() {
    localStorage.clear();
    this.state.trips = [];
    this.state.bookings = [];
    this.state.parcels = [];
    this.state.lostItems = [];
    this.state.user = null;
    this.token = null;
    this.toast('Barcha ma\'lumotlar tozalandi', 'success');
    this.updateNav();
    this.navigate('landing');
  },

  // ===== PASSENGER =====
  switchPassengerTab(tab) {
    document.querySelectorAll('#page-passenger .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-passenger .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    event.target.classList.add('active');
    if (tab === 'mytrips') this.renderMyTrips();
    if (tab === 'history') this.renderHistory();
    if (tab === 'lostitems') this.renderPassengerLostItems();
  },

  renderPassenger() {
    if (!this.state.user) return;
    document.getElementById('passenger-greeting').textContent = `👋 ${this.state.user.name}`;
    this.searchTripsFromInput();
  },

  searchTripsFromInput() {
    const from = document.getElementById('search-from').value.trim();
    const to = document.getElementById('search-to').value.trim();
    const minPrice = parseInt(document.getElementById('search-min-price').value) || 0;
    const maxPrice = parseInt(document.getElementById('search-max-price').value) || Infinity;

    this.searchTrips(from, to).then(trips => {
      let results = trips;
      if (minPrice > 0) results = results.filter(t => t.price >= minPrice);
      if (maxPrice < Infinity) results = results.filter(t => t.price <= maxPrice);

      const container = document.getElementById('search-results');
      const empty = document.getElementById('search-empty');
      if (results.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        container.innerHTML = results.map(t => this.renderTripCard(t)).join('');
      }
    }).catch(err => {
      // Fallback to local data
      let results = this.state.trips.filter(t => t.status === 'active');
      if (from) results = results.filter(t => t.departureCity.toLowerCase().includes(from.toLowerCase()));
      if (to) results = results.filter(t => t.destinationCity.toLowerCase().includes(to.toLowerCase()));
      results = results.filter(t => t.price >= minPrice && t.price <= maxPrice);
      const container = document.getElementById('search-results');
      const empty = document.getElementById('search-empty');
      if (results.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        container.innerHTML = results.map(t => this.renderTripCard(t)).join('');
      }
    });
  },

  renderTripCard(t) {
    // Handle both backend format (from_location, to_location) and local format (departureCity, destinationCity)
    const fromCity = t.departureCity || t.from_location || 'Noma\'lum';
    const toCity = t.destinationCity || t.to_location || 'Noma\'lum';
    const depTime = t.departureTime ? new Date(t.departureTime) : null;
    const arrTime = t.arrivalTime ? new Date(t.arrivalTime) : null;
    const fmt = d => d ? d.toLocaleTimeString('uz', {hour:'2-digit',minute:'2-digit'}) : '--:--';
    const totalSeats = t.totalSeats || t.total_seats || 4;
    const occupied = t.occupiedSeats || t.occupied_seats || [];
    const avail = totalSeats - occupied.length;
    const carModel = t.carModel || t.car_model || 'Noma\'lum';
    const driverRating = t.driverRating || t.driver_rating || 4.5;
    const price = t.price || 0;
    return `
      <div class="trip-card" onclick="app.openSeatMap('${t.id}')">
        <div>
          <div class="trip-route">
            <div class="trip-point"><div class="trip-time">${fmt(depTime)}</div><div class="trip-city">${fromCity}</div></div>
            <div class="trip-line"></div>
            <div class="trip-point"><div class="trip-time">${fmt(arrTime)}</div><div class="trip-city">${toCity}</div></div>
          </div>
          <div class="trip-info">
            <span>⭐ ${driverRating}</span>
            <span>🪑 ${avail} bo'sh</span>
            <span>🚗 ${carModel}</span>
          </div>
        </div>
        <div class="trip-price-section">
          <div class="trip-price">${price.toLocaleString()} so'm</div>
          <div class="trip-seats">1 o'rindiq uchun</div>
          <button class="btn btn-primary btn-sm" style="margin-top:8px">${this.tr('passenger.bookNow')}</button>
        </div>
      </div>`;
  },

  renderMyTrips() {
    const list = document.getElementById('my-trips-list');
    const empty = document.getElementById('my-trips-empty');
    const myBookings = this.state.bookings.filter(b => b.passengerId === this.state.user?.id && b.status === 'confirmed');
    if (myBookings.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = myBookings.map(b => {
        const trip = this.state.trips.find(t => t.id === b.tripId);
        if (!trip) return '';
        return `<div class="trip-card"><div><strong>${trip.departureCity} → ${trip.destinationCity}</strong><br><span class="trip-info"><span>📅 ${new Date(trip.departureTime).toLocaleDateString()}</span><span>🪑 O'rindiqlar: ${b.seatNumbers.join(', ')}</span></span></div><div class="trip-price-section"><div class="trip-price">${b.totalPrice.toLocaleString()} so'm</div><span class="admin-badge badge-success">Tasdiqlangan</span></div></div>`;
      }).join('');
    }
  },

  renderHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    const completed = this.state.bookings.filter(b => b.passengerId === this.state.user?.id && b.status === 'completed');
    if (completed.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = completed.map(b => {
        const trip = this.state.trips.find(t => t.id === b.tripId);
        if (!trip) return '';
        return `<div class="trip-card"><div><strong>${trip.departureCity} → ${trip.destinationCity}</strong><br><span class="trip-info"><span>📅 ${new Date(trip.departureTime).toLocaleDateString()}</span><span>🪑 ${b.seatNumbers.join(', ')}</span></span></div><div class="trip-price-section"><div class="trip-price">${b.totalPrice.toLocaleString()} so'm</div><span class="admin-badge badge-info">Tugagan</span></div></div>`;
      }).join('');
    }
  },

  // ===== SEAT MAP =====
  openSeatMap(tripId) {
    this.state.currentTripId = tripId;
    this.state.selectedSeats = [];
    this.navigate('seat');
  },

  renderSeatPage() {
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    const total = trip.totalSeats;
    const occupied = trip.occupiedSeats;
    const reserved = trip.reservedSeats || [];
    const selected = this.state.selectedSeats;

    const getSeatStatus = (num) => {
      if (occupied.includes(num)) return 'occupied';
      if (reserved.includes(num)) return 'reserved';
      if (selected.includes(num)) return 'selected';
      return 'available';
    };

    // Layout: Row0 = [Driver, Front passenger], Row1 = [Back-left, Back-center, Back-right]
    let html = '<div class="seat-row">';
    html += `<button class="seat-btn seat-driver" disabled><span class="seat-icon">🚗</span>${this.tr('seats.driver')}</button>`;
    html += this.renderSeatBtn(2, getSeatStatus(2));
    html += '</div>';

    // Back row: 3 seats (left, center, right)
    if (total >= 5) {
      html += '<div class="seat-row three-seats">';
      html += this.renderSeatBtn(3, getSeatStatus(3));
      html += this.renderSeatBtn(4, getSeatStatus(4));
      html += this.renderSeatBtn(5, getSeatStatus(5));
      html += '</div>';
    } else {
      // Fallback for less than 5 total seats
      for (let i = 3; i <= total; i += 2) {
        html += '<div class="seat-row">';
        html += this.renderSeatBtn(i, getSeatStatus(i));
        if (i + 1 <= total) html += this.renderSeatBtn(i+1, getSeatStatus(i+1));
        html += '</div>';
      }
    }

    document.getElementById('car-seat-map').innerHTML = `<div class="car-front"></div>${html}<div class="car-back"></div>`;

    // Selected info
    const info = document.getElementById('selected-seats-info');
    if (selected.length > 0) {
      info.innerHTML = `✅ ${this.tr('seats.selected')}: ${selected.join(', ')}-o'rindiq`;
      info.classList.remove('hidden');
    } else {
      info.classList.add('hidden');
    }

    // Trip info sidebar
    const depTime = new Date(trip.departureTime);
    const arrTime = new Date(trip.arrivalTime);
    const totalPrice = trip.price * selected.length;
    document.getElementById('seat-trip-info').innerHTML = `
      <div class="trip-info-header">📋 Reys ma'lumotlari</div>
      <div class="trip-info-row"><span class="label">Haydovchi</span><span class="value">⭐ ${trip.driverRating} ${trip.driverName}</span></div>
      <div class="trip-info-row"><span class="label">Mashina</span><span class="value">🚗 ${trip.carModel} (${trip.carColor})</span></div>
      <div class="trip-info-row"><span class="label">Yo'nalish</span><span class="value">${trip.departureCity} → ${trip.destinationCity}</span></div>
      <div class="trip-info-row"><span class="label">Jo'nash</span><span class="value">📅 ${depTime.toLocaleDateString()} ${depTime.toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="trip-info-row"><span class="label">Yetib kelish</span><span class="value">📅 ${arrTime.toLocaleTimeString('uz',{hour:'2-digit',minute:'2-digit'})}</span></div>
      <div class="trip-info-row"><span class="label">1 o'rindiq</span><span class="value">${trip.price.toLocaleString()} so'm</span></div>
      <div class="trip-info-row"><span class="label">Tanlangan</span><span class="value">${selected.length > 0 ? selected.join(', ') + '-o\'rindiq' : 'Tanlanmagan'}</span></div>
      <div class="trip-info-total">Jami: ${totalPrice.toLocaleString()} so'm</div>
      <button class="btn btn-primary btn-block btn-lg" onclick="app.proceedToBooking()" ${selected.length===0?'disabled':''}>${this.tr('passenger.bookNow')}</button>
    `;
  },

  renderSeatBtn(num, status) {
    const icons = {available:'💺',selected:'✅',occupied:'👤',reserved:'⏳'};
    const classMap = {available:'seat-available',selected:'seat-selected',occupied:'seat-occupied',reserved:'seat-reserved'};
    const disabled = (status === 'occupied' || status === 'reserved') ? 'disabled' : '';
    const check = status === 'selected' ? '<span class="seat-check">✓</span>' : '';
    return `<button class="seat-btn ${classMap[status]||'seat-available'}" ${disabled} onclick="app.toggleSeat(${num})"><span class="seat-icon">${icons[status]||'💺'}</span>${num}${check}</button>`;
  },

  toggleSeat(num) {
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    if (trip.occupiedSeats.includes(num) || (trip.reservedSeats || []).includes(num)) {
      this.toast('Bu o\'rindiqni boshqa odam oldi', 'error'); return;
    }
    const idx = this.state.selectedSeats.indexOf(num);
    if (idx > -1) {
      this.state.selectedSeats.splice(idx, 1);
    } else {
      if (this.state.selectedSeats.length >= 4) { this.toast('Ko\'pi bilan 4 ta o\'rindiq tanlash mumkin', 'error'); return; }
      this.state.selectedSeats.push(num);
    }
    this.renderSeatPage();
  },

  manualSeatSelect() {
    const input = document.getElementById('manual-seat-input').value.trim();
    if (!input) { this.toast('O\'rindiq raqamini kiriting', 'error'); return; }
    const nums = input.split(/[,.\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    if (nums.length === 0) { this.toast('To\'g\'ri raqam kiriting, masalan: 3,4', 'error'); return; }
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    for (const num of nums) {
      if (num < 2 || num > trip.totalSeats) { this.toast(`${num}-o'rindiq yo'q (2 dan ${trip.totalSeats} gacha)`, 'error'); continue; }
      if (trip.occupiedSeats.includes(num) || (trip.reservedSeats || []).includes(num)) { this.toast(`${num}-o'rindiq band`, 'error'); continue; }
      if (this.state.selectedSeats.includes(num)) { this.toast(`${num}-o'rindiq allaqachon tanlangan`, 'info'); continue; }
      if (this.state.selectedSeats.length >= 4) { this.toast('Ko\'pi bilan 4 ta o\'rindiq tanlash mumkin', 'error'); break; }
      this.state.selectedSeats.push(num);
    }
    document.getElementById('manual-seat-input').value = '';
    this.renderSeatPage();
    if (this.state.selectedSeats.length > 0) this.toast(`✅ O'rindiqlar tanlandi: ${this.state.selectedSeats.join(', ')}`, 'success');
  },

  proceedToBooking() {
    if (this.state.selectedSeats.length === 0) { this.toast('Avval o\'rindiq tanlang', 'error'); return; }
    this.navigate('booking');
  },

  // ===== BOOKING =====
  renderBookingPage() {
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    const seats = this.state.selectedSeats;
    const total = trip.price * seats.length;
    document.getElementById('booking-details').innerHTML = `
      <div class="booking-success">
        <div class="icon">🎉</div>
        <h2>${this.tr('passenger.bookingConfirmed')}</h2>
      </div>
      <div class="booking-details">
        <div class="booking-row"><span class="label">Yo'nalish</span><span class="value">${trip.departureCity} → ${trip.destinationCity}</span></div>
        <div class="booking-row"><span class="label">Haydovchi</span><span class="value">⭐ ${trip.driverRating} ${trip.driverName}</span></div>
        <div class="booking-row"><span class="label">Mashina</span><span class="value">${trip.carModel} (${trip.carColor})</span></div>
        <div class="booking-row"><span class="label">Jo'nash</span><span class="value">${new Date(trip.departureTime).toLocaleString('uz')}</span></div>
        <div class="booking-row"><span class="label">O'rindiqlar</span><span class="value">${seats.join(', ')}-o'rindiq</span></div>
        <div class="booking-row"><span class="label">1 o'rindiq narxi</span><span class="value">${trip.price.toLocaleString()} so'm</span></div>
        <div class="booking-row" style="font-size:18px;font-weight:800"><span class="label" style="color:var(--text)">Jami</span><span class="value" style="color:var(--primary)">${total.toLocaleString()} so'm</span></div>
      </div>
      <div class="payment-methods">
        <h3>${this.tr('booking.paymentMethod')}</h3>
        <div class="payment-options">
          <button class="payment-opt ${this.state.selectedPayment==='cash'?'active':''}" onclick="app.selectPayment('cash')"><div class="icon">💵</div><div class="label">${this.tr('booking.cash')}</div></button>
          <button class="payment-opt ${this.state.selectedPayment==='card'?'active':''}" onclick="app.selectPayment('card')"><div class="icon">💳</div><div class="label">${this.tr('booking.card')}</div></button>
          <button class="payment-opt ${this.state.selectedPayment==='online'?'active':''}" onclick="app.selectPayment('online')"><div class="icon">📱</div><div class="label">${this.tr('booking.online')}</div></button>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" onclick="app.confirmBooking()">${this.tr('booking.confirm')}</button>
    `;
  },

  selectPayment(method) {
    this.state.selectedPayment = method;
    this.renderBookingPage();
  },

  confirmBooking() {
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    const seats = [...this.state.selectedSeats];
    const total = trip.price * seats.length;

    // Mark seats as occupied
    trip.occupiedSeats = [...trip.occupiedSeats, ...seats];
    trip.availableSeats = trip.totalSeats - trip.occupiedSeats.length;

    // Create booking
    const booking = {
      id: 'b_' + Date.now(),
      tripId: trip.id,
      passengerId: this.state.user.id,
      passengerName: this.state.user.name,
      seatNumbers: seats,
      totalPrice: total,
      paymentMethod: this.state.selectedPayment,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    this.state.bookings.push(booking);
    this.state.selectedSeats = [];
    this.saveState();
    this.toast('🎉 Bron muvaffaqiyatli! O\'rindiqlar band qilindi', 'success');
    this.navigate('passenger');
    this.switchPassengerTabManually('mytrips');
    this.renderMyTrips();
  },

  switchPassengerTabManually(tab) {
    document.querySelectorAll('#page-passenger .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-passenger .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    // Find the tab button
    document.querySelectorAll('#page-passenger .tab').forEach(t => {
      if (t.textContent.includes(tab === 'mytrips' ? 'Mening' : tab === 'history' ? 'O\'tgan' : 'Reys')) t.classList.add('active');
    });
  },

  // ===== DRIVER =====
  switchDriverTab(tab) {
    document.querySelectorAll('#page-driver .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-driver .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-driver-' + tab).classList.add('active');
    event.target.classList.add('active');
    if (tab === 'mytrips') this.renderDriverTrips();
    if (tab === 'earnings') this.renderEarnings();
    if (tab === 'fuel') this.calcFuel();
    if (tab === 'lostitems') this.renderDriverLostItems();
    if (tab === 'parcels') this.renderDriverParcels();
  },

  renderDriver() {
    if (!this.state.user) return;
    document.getElementById('driver-greeting').textContent = `👋 ${this.state.user.name}`;
  },

  createTrip() {
    const from = document.getElementById('trip-from').value.trim();
    const to = document.getElementById('trip-to').value.trim();
    const time = document.getElementById('trip-time').value;
    const arrival = document.getElementById('trip-arrival').value;
    const car = document.getElementById('trip-car').value;
    const seats = parseInt(document.getElementById('trip-seats').value);
    const price = parseInt(document.getElementById('trip-price').value);
    const color = document.getElementById('trip-color').value;

    if (!from || !to || !time || !price) { this.toast('Barcha maydonlarni to\'ldiring', 'error'); return; }

    const data = {
      from_location: from,
      to_location: to,
      departure_time: time,
      arrival_time: arrival || time,
      available_seats: seats,
      price: price,
      car_model: car,
      car_color: color
    };

    this.createDriverTrip(data).then(res => {
      this.toast('✅ Reys muvaffaqiyatli yaratildi!', 'success');
      // Reset form
      document.getElementById('trip-from').value = '';
      document.getElementById('trip-to').value = '';
      this.switchDriverTabManually('mytrips');
      this.renderDriverTrips();
    }).catch(err => {
      // Fallback to local mode
      const trip = {
        id: 't_' + Date.now(),
        driverId: this.state.user.id,
        driverName: this.state.user.name,
        driverRating: 4.5 + Math.random() * 0.5,
        carModel: car,
        carColor: color,
        departureCity: from,
        destinationCity: to,
        departureTime: time,
        arrivalTime: arrival || time,
        price,
        totalSeats: seats,
        availableSeats: seats,
        occupiedSeats: [],
        status: 'active',
      };
      this.state.trips.push(trip);
      this.saveState();
      this.toast('✅ Reys muvaffaqiyatli yaratildi!', 'success');
      document.getElementById('trip-from').value = '';
      document.getElementById('trip-to').value = '';
      this.switchDriverTabManually('mytrips');
      this.renderDriverTrips();
    });
  },

  switchDriverTabManually(tab) {
    document.querySelectorAll('#page-driver .tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#page-driver .tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-driver-' + tab).classList.add('active');
  },

  renderDriverTrips() {
    const list = document.getElementById('driver-trips-list');
    const empty = document.getElementById('driver-trips-empty');
    const myTrips = this.state.trips.filter(t => t.driverId === this.state.user?.id);
    if (myTrips.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = myTrips.map(t => {
        const booked = t.occupiedSeats.length;
        return `<div class="trip-card">
          <div>
            <strong>${t.departureCity} → ${t.destinationCity}</strong>
            <div class="trip-info">
              <span>📅 ${new Date(t.departureTime).toLocaleString('uz')}</span>
              <span>🪑 ${booked}/${t.totalSeats} band</span>
              <span>💰 ${t.price.toLocaleString()} so'm/o'rindiq</span>
            </div>
          </div>
          <div>
            <span class="admin-badge ${t.status==='active'?'badge-success':'badge-info'}">${t.status==='active'?'Faol':'Tugagan'}</span>
            <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="app.completeTrip('${t.id}')">Tugatish</button>
          </div>
        </div>`;
      }).join('');
    }
  },

  completeTrip(tripId) {
    const trip = this.state.trips.find(t => t.id === tripId);
    if (trip) {
      trip.status = 'completed';
      // Mark related bookings as completed
      this.state.bookings.filter(b => b.tripId === tripId).forEach(b => b.status = 'completed');
      this.saveState();
      this.toast('Reys tugadi!', 'success');
      this.renderDriverTrips();
    }
  },

  renderEarnings() {
    const myTrips = this.state.trips.filter(t => t.driverId === this.state.user?.id);
    const completedBookings = this.state.bookings.filter(b => myTrips.some(t => t.id === b.tripId));
    const totalEarnings = completedBookings.reduce((s, b) => s + b.totalPrice, 0);
    const todayEarnings = completedBookings.filter(b => new Date(b.createdAt).toDateString() === new Date().toDateString()).reduce((s, b) => s + b.totalPrice, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const weekEarnings = completedBookings.filter(b => new Date(b.createdAt) >= weekStart).reduce((s, b) => s + b.totalPrice, 0);
    const monthStart = new Date(); monthStart.setMonth(monthStart.getMonth() - 1);
    const monthEarnings = completedBookings.filter(b => new Date(b.createdAt) >= monthStart).reduce((s, b) => s + b.totalPrice, 0);

    document.getElementById('earnings-grid').innerHTML = `
      <div class="earning-card"><div class="label">💰 Bugun</div><div class="amount">${todayEarnings.toLocaleString()}</div><div class="label">so'm</div></div>
      <div class="earning-card"><div class="label">📅 Shu hafta</div><div class="amount">${weekEarnings.toLocaleString()}</div><div class="label">so'm</div></div>
      <div class="earning-card"><div class="label">🗓️ Shu oy</div><div class="amount">${monthEarnings.toLocaleString()}</div><div class="label">so'm</div></div>
      <div class="earning-card"><div class="label">🏆 Jami</div><div class="amount">${totalEarnings.toLocaleString()}</div><div class="label">so'm</div></div>
    `;
  },

  // ===== ADMIN =====
  renderAdmin() {
    const totalUsers = new Set(this.state.bookings.map(b => b.passengerId)).size + new Set(this.state.trips.map(t => t.driverId)).size;
    const totalDrivers = new Set(this.state.trips.map(t => t.driverId)).size;
    const totalRides = this.state.trips.length;
    const revenue = this.state.bookings.reduce((s, b) => s + b.totalPrice, 0);

    document.getElementById('admin-stats').innerHTML = `
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${totalUsers || 5}</div><div class="stat-label">${this.tr('admin.totalUsers')}</div></div>
      <div class="stat-card"><div class="stat-icon">🚗</div><div class="stat-value">${totalDrivers || 6}</div><div class="stat-label">${this.tr('admin.totalDrivers')}</div></div>
      <div class="stat-card"><div class="stat-icon">🛣️</div><div class="stat-value">${totalRides}</div><div class="stat-label">${this.tr('admin.totalRides')}</div></div>
    `;

    // Rides list
    document.getElementById('admin-rides-list').innerHTML = this.state.trips.slice(0, 5).map(t =>
      `<div class="admin-item"><span>${t.departureCity} → ${t.destinationCity}</span><span class="admin-badge ${t.status==='active'?'badge-success':'badge-info'}">${t.status==='active'?'Faol':'Tugagan'}</span></div>`
    ).join('') || '<div class="empty-state"><p>Hali reyslar yo\'q</p></div>';

    // Users list
    const users = this.state.bookings.map(b => b.passengerName).filter((v,i,a) => a.indexOf(v)===i);
    document.getElementById('admin-users-list').innerHTML = users.length ? users.map(u =>
      `<div class="admin-item"><span>🧑 ${u}</span><span class="admin-badge badge-info">Yo'lovchi</span></div>`
    ).join('') : '<div class="empty-state"><p>Hali foydalanuvchilar yo\'q</p></div>';

    // Lost Items list
    const lostItems = this.state.lostItems;
    document.getElementById('admin-lostitems-list').innerHTML = lostItems.length ? lostItems.map(i => {
      const statusMap = {reported:{label:'Xabar berilgan',badge:'badge-danger'},found:{label:'Topilgan',badge:'badge-warning'},inprocess:{label:'Jarayonda',badge:'badge-info'},returned:{label:'Qaytarilgan',badge:'badge-success'}};
      const s = statusMap[i.status] || statusMap.reported;
      return `<div class="admin-item"><span>📦 ${i.itemName} — ${i.reporterName}</span><span class="admin-badge ${s.badge}">${s.label}</span></div>`;
    }).join('') : '<div class="empty-state"><p>Hali yo\'qolgan buyum xabari yo\'q</p></div>';

    // Parcels list
    const parcels = this.state.parcels;
    const statusMap = {pending:{label:'Kutilmoqda',badge:'badge-danger'},accepted:{label:'Qabul qilindi',badge:'badge-warning'},indelivery:{label:'Yo\'lda',badge:'badge-info'},delivered:{label:'Yetkazildi',badge:'badge-success'}};
    document.getElementById('admin-parcels-list').innerHTML = parcels.length ? parcels.map(p => {
      const s = statusMap[p.status] || statusMap.pending;
      return `<div class="admin-item"><span>� ${p.from} → ${p.to} — ${p.senderName}</span><span class="admin-badge ${s.badge}">${s.label}</span></div>`;
    }).join('') : '<div class="empty-state"><p>Hali pochta buyurtmasi yo\'q</p></div>';
  },

  // ===== FUEL CALCULATOR =====
  calcFuel() {
    const dist = parseFloat(document.getElementById('fuel-distance').value) || 0;
    const consumption = parseFloat(document.getElementById('fuel-consumption').value) || 0;
    const fuelPrice = parseFloat(document.getElementById('fuel-price').value) || 0;
    const passengers = parseInt(document.getElementById('fuel-passengers').value) || 0;
    const seatPrice = parseFloat(document.getElementById('fuel-seatprice').value) || 0;

    const fuelUsed = (dist * consumption) / 100;
    const fuelCost = fuelUsed * fuelPrice;
    const totalIncome = seatPrice * passengers;
    const netProfit = totalIncome - fuelCost;
    const profitPerKm = dist > 0 ? netProfit / dist : 0;

    const el = document.getElementById('fuel-results');
    if (!el) return;
    const profitClass = netProfit >= 0 ? 'profit' : 'loss';
    const profitIcon = netProfit >= 0 ? '✅' : '⚠️';

    el.innerHTML = `
      <div class="fuel-row"><span class="label">⛽ Yoqilg'i sarfi</span><span class="value">${fuelUsed.toFixed(1)} litr</span></div>
      <div class="fuel-row"><span class="label">💰 Yoqilg'i narxi</span><span class="value">${fuelCost.toLocaleString()} so'm</span></div>
      <div class="fuel-row"><span class="label">💵 Jami daromad</span><span class="value">${totalIncome.toLocaleString()} so'm</span></div>
      <div class="fuel-row total ${profitClass}"><span class="label">${profitIcon} Sof foyda</span><span class="value">${netProfit.toLocaleString()} so'm</span></div>
      <div class="fuel-row"><span class="label">📊 1 km uchun foyda</span><span class="value">${profitPerKm.toFixed(0)} so'm</span></div>
      ${netProfit < 0 ? '<div class="fuel-row loss"><span class="label">💡 Maslahat: narxni kamida ' + Math.ceil((fuelCost / passengers + 1) / 1000) * 1000 + ' so\'m qiling</span><span class="value"></span></div>' : ''}
    `;
  },

  // ===== LOST ITEMS =====
  reportLostItem() {
    const name = document.getElementById('lost-item-name').value.trim();
    const date = document.getElementById('lost-item-date').value;
    const driver = document.getElementById('lost-item-driver').value.trim();
    const desc = document.getElementById('lost-item-desc').value.trim();
    const photoInput = document.getElementById('lost-item-photo');
    let photoName = '';
    if (photoInput.files && photoInput.files[0]) photoName = photoInput.files[0].name;

    if (!name) { this.toast('Buyum nomini kiriting', 'error'); return; }
    if (!desc) { this.toast('Buyum tavsifini yozing', 'error'); return; }

    const item = {
      id: 'li_' + Date.now(),
      reporterId: this.state.user.id,
      reporterName: this.state.user.name,
      reporterPhone: this.state.user.phone,
      itemName: name,
      tripDate: date,
      driverName: driver,
      description: desc,
      photo: photoName,
      status: 'reported',
      createdAt: new Date().toISOString(),
    };
    this.state.lostItems.push(item);
    this.saveState();
    this.toast('✅ Xabar yuborildi! Admin va haydovchiga yetkaziladi', 'success');
    // Reset form
    document.getElementById('lost-item-name').value = '';
    document.getElementById('lost-item-date').value = '';
    document.getElementById('lost-item-driver').value = '';
    document.getElementById('lost-item-desc').value = '';
    document.getElementById('lost-item-photo').value = '';
    this.renderPassengerLostItems();
  },

  renderPassengerLostItems() {
    const myItems = this.state.lostItems.filter(i => i.reporterId === this.state.user?.id);
    const list = document.getElementById('my-lostitems-list');
    const empty = document.getElementById('my-lostitems-empty');
    // Populate drivers datalist
    const driversList = document.getElementById('drivers-list');
    if (driversList) {
      const drivers = [...new Set(this.state.trips.map(t => t.driverName))];
      driversList.innerHTML = drivers.map(d => `<option value="${d}">`).join('');
    }
    if (myItems.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = myItems.map(i => this.renderLostItemCard(i, 'passenger')).join('');
    }
  },

  renderDriverLostItems() {
    const driverName = this.state.user?.name;
    const items = this.state.lostItems.filter(i => i.driverName === driverName || i.status !== 'returned');
    const list = document.getElementById('driver-lostitems-list');
    const empty = document.getElementById('driver-lostitems-empty');
    if (items.length === 0) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
    } else {
      empty.classList.add('hidden');
      list.innerHTML = items.map(i => this.renderLostItemCard(i, 'driver')).join('');
    }
  },

  renderLostItemCard(item, view) {
    const statusMap = {
      reported: {label:'Xabar berilgan',badge:'badge-danger',icon:'🔴'},
      found: {label:'Topilgan',badge:'badge-warning',icon:'🟡'},
      inprocess: {label:'Jarayonda',badge:'badge-info',icon:'🔵'},
      returned: {label:'Qaytarilgan',badge:'badge-success',icon:'🟢'},
    };
    const s = statusMap[item.status] || statusMap.reported;
    let actions = '';
    if (view === 'driver' && item.status === 'reported') {
      actions = `<button class="btn btn-success btn-sm" onclick="app.updateLostItemStatus('${item.id}','found')">✅ Topdim</button>`;
    }
    if (view === 'driver' && item.status === 'found') {
      actions = `<button class="btn btn-primary btn-sm" onclick="app.updateLostItemStatus('${item.id}','inprocess')">📦 Yetkazish jarayonida</button>`;
    }
    if (view === 'driver' && item.status === 'inprocess') {
      actions = `<button class="btn btn-success btn-sm" onclick="app.updateLostItemStatus('${item.id}','returned')">✅ Qaytarilgan</button>`;
    }
    if (view === 'driver') {
      actions += ` <button class="btn btn-outline btn-sm" onclick="app.contactPassenger('${item.reporterPhone}')">📞 Bog'lanish</button>`;
    }
    return `
      <div class="lost-item-card">
        <div class="lost-item-header">
          <strong>${item.itemName}</strong>
          <span class="admin-badge ${s.badge}">${s.icon} ${s.label}</span>
        </div>
        <div class="lost-item-body">
          <p>📅 Reys: ${item.tripDate || 'Ko\'rsatilmagan'}</p>
          <p>🚗 Haydovchi: ${item.driverName || 'Ko\'rsatilmagan'}</p>
          <p>📝 ${item.description}</p>
          ${item.photo ? '<p>🖼️ Rasm: ' + item.photo + '</p>' : ''}
          <p>👤 Xabar beruvchi: ${item.reporterName}</p>
        </div>
        ${actions ? '<div class="lost-item-actions">' + actions + '</div>' : ''}
      </div>`;
  },

  updateLostItemStatus(itemId, newStatus) {
    const item = this.state.lostItems.find(i => i.id === itemId);
    if (item) {
      item.status = newStatus;
      this.saveState();
      const statusLabels = {found:'Topilgan',inprocess:'Jarayonda',returned:'Qaytarilgan'};
      this.toast(`✅ Holat yangilandi: ${statusLabels[newStatus]}`, 'success');
      this.renderDriverLostItems();
    }
  },

  contactPassenger(phone) {
    this.toast(`📞 Yo'lovchi raqami: ${phone}`, 'info');
  },

  // ===== SIMULATE OTHER USER =====
  simulateOtherUser() {
    const trip = this.state.trips.find(t => t.id === this.state.currentTripId);
    if (!trip) return;
    const occupied = trip.occupiedSeats;
    const mySelected = this.state.selectedSeats;
    const available = [];
    for (let i = 2; i <= trip.totalSeats; i++) {
      if (!occupied.includes(i) && !mySelected.includes(i)) available.push(i);
    }
    if (available.length === 0) { this.toast('Bo\'sh o\'rindiq yo\'q - boshqa mijoz band qila olmaydi', 'error'); return; }
    const seat = available[Math.floor(Math.random() * available.length)];

    // 1-qadam: sariq "kimdir bron qilmoqda" holat
    if (!trip.reservedSeats) trip.reservedSeats = [];
    trip.reservedSeats.push(seat);
    this.renderSeatPage();
    this.toast(`⚠️ Boshqa mijoz ${seat}-o'rindiqni tanladi...`, 'info');

    // 2-qadam: 3 soniyadan keyin band (kul) holatga o'tadi
    setTimeout(() => {
      trip.reservedSeats = trip.reservedSeats.filter(s => s !== seat);
      trip.occupiedSeats.push(seat);
      trip.availableSeats = trip.totalSeats - trip.occupiedSeats.length;
      this.saveState();
      this.renderSeatPage();
      this.toast(`🚫 ${seat}-o'rindiq boshqa mijoz tomonidan band qilindi`, 'error');
    }, 3000);
  },

  // ===== TOAST =====
  toast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  },

  // ===== PROFILE SETTINGS =====
  renderProfile() {
    if (!this.state.user) return;
    document.getElementById('profile-name').value = this.state.user.name || '';
    document.getElementById('profile-phone').value = this.state.user.phone || '';
    document.getElementById('profile-photo').value = this.state.user.profile_photo || '';
    document.getElementById('profile-lang').value = this.state.lang || 'uz';
  },

  saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const photo = document.getElementById('profile-photo').value.trim();
    const lang = document.getElementById('profile-lang').value;

    if (!name) { this.toast('Ism kiriting', 'error'); return; }

    const data = { full_name: name, profile_photo: photo };
    this.updateProfile(data).then(res => {
      this.state.user.name = name;
      this.state.lang = lang;
      this.saveState();
      this.applyLang();
      this.updateNav();
      this.toast('✅ Profil yangilandi!', 'success');
      this.goBack();
    }).catch(err => {
      // Fallback
      this.state.user.name = name;
      this.state.lang = lang;
      this.saveState();
      this.applyLang();
      this.updateNav();
      this.toast('✅ Profil saqlandi (local)', 'success');
      this.goBack();
    });
  },

  changePasswordHandler() {
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;

    if (!current || !newPass) { this.toast('Ikkala parolni ham kiriting', 'error'); return; }
    if (newPass.length < 6) { this.toast('Yangi parol kamida 6 ta belgi bo\'lsin', 'error'); return; }

    this.changePassword({ current, new: newPass }).then(res => {
      this.toast('✅ Parol yangilandi!', 'success');
      document.getElementById('current-password').value = '';
      document.getElementById('new-password').value = '';
    }).catch(err => {
      this.toast('⚠️ Backend ulanmagan - parol saqlanmadi', 'error');
    });
  },
};

// ===== START =====
document.addEventListener('DOMContentLoaded', () => app.init());
