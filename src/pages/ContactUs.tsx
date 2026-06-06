import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function ContactUs() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-semibold mb-4">Get in Touch</h2>
          <p className="mb-6 text-muted-foreground">
            Have questions about your order or our services? Our team is here to help you 24/7.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Our Office</h3>
                <p className="text-sm text-muted-foreground">30 Cecil Street #21-05<br />Singapore 048716</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Email Support</h3>
                <p className="text-sm text-muted-foreground">support@1-cartforu.com</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Phone</h3>
                <p className="text-sm text-muted-foreground">+65 6XXX XXXX (International Support)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-8 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-6">Send a Message</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder="john@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <textarea className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[120px]" placeholder="How can we help you?"></textarea>
            </div>
            <button type="button" className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
