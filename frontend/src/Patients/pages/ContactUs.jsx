import React, { useState } from 'react';
import { Send, Clock } from 'lucide-react';
import { CONTACT_INFO, OPERATING_HOURS } from "../../data/contactData";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submitted Data:', formData);
    alert('Thank you! Your message has been sent.');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-[#44474D]">
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm mb-8 border border-gray-100">
          <h1 className="text-4xl font-extrabold text-[#0D1C32] mb-3">Contact Us</h1>
          <p className="text-[#6B7280] max-w-xl mx-auto text-sm leading-relaxed">
            We are here to help. Reach out to the MedSync team for any inquiries, support,
            or to schedule your next visit.
          </p>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
    
          <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-[#0D1C32] mb-6">Send us a message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44474D] mb-1">First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Jane"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474D] mb-1">Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#44474D] mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474D] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44474D] mb-1">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="How can we help you?"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44474D] mb-1">Message</label>
                <textarea
                  name="message"
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#007b8a] transition-colors resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-[#007b8a] hover:bg-[#00606c] text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                Send Message <Send size={16} />
              </button>
            </form>
          </div>

        
          <div className="flex flex-col gap-4">
            {CONTACT_INFO.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4"
                >
                  <div className="p-3 bg-[#007b8a]/10 text-[#007b8a] rounded-full shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <span className="text-xs text-[#6B7280] font-medium block mb-0.5">{item.title}</span>
                    <h3 className="text-sm font-bold text-[#0D1C32]">{item.value}</h3>
                    <p className="text-xs text-[#6B7280] mt-0.5">{item.subtext}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


        <div className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <iframe
            title="San Francisco Map"
            src="https://maps.google.com/maps?q=San%20Francisco%20CA&t=&z=13&ie=UTF8&iwloc=&output=embed"
            className="w-full h-full border-0 grayscale-[15%] contrast-[105%]"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>

          <div className="absolute bottom-6 left-6 bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-100 w-64 z-10">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0D1C32] mb-3">
              <Clock size={14} className="text-[#007b8a]" />
              <span>Operating Hours</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {OPERATING_HOURS.map((slot, index) => (
                <div key={index} className="flex justify-between items-center text-[#44474D]">
                  <span className="text-[#6B7280]">{slot.days}</span>
                  <span className={`font-semibold ${slot.closed ? 'text-red-500' : 'text-[#0D1C32]'}`}>
                    {slot.hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

    
      <footer className="bg-[#0D1C32] text-white mt-12 py-8 px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold">MedSync</div>
            <p className="text-xs text-[#76849F] mt-1">
              © 2026 MedSync Healthcare. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6 text-xs text-[#76849F]">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#portal" className="hover:text-white transition-colors">Patient Portal</a>
            <a href="#support" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}