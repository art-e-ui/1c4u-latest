import React from 'react';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <div className="prose prose-slate max-w-none">
        <p className="mb-4">Last updated: March 27, 2026</p>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and using GlobalCart Online Shop (the "Website"), you agree to be bound by these Terms of Service 
          and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited 
          from using or accessing this site.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">2. Use License</h2>
        <p className="mb-4">
          Permission is granted to temporarily download one copy of the materials (information or software) on 
          GlobalCart Online Shop's website for personal, non-commercial transitory viewing only. 
          This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>modify or copy the materials;</li>
          <li>use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</li>
          <li>attempt to decompile or reverse engineer any software contained on GlobalCart Online Shop's website;</li>
          <li>remove any copyright or other proprietary notations from the materials; or</li>
          <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
        </ul>

        <h2 className="text-xl font-semibold mt-8 mb-4">3. Disclaimer</h2>
        <p className="mb-4">
          The materials on GlobalCart Online Shop's website are provided on an 'as is' basis. 
          GlobalCart Online Shop makes no warranties, expressed or implied, and hereby disclaims and negates 
          all other warranties including, without limitation, implied warranties or conditions of merchantability, 
          fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">4. Limitations</h2>
        <p className="mb-4">
          In no event shall GlobalCart Online Shop or its suppliers be liable for any damages (including, without limitation, 
          damages for loss of data or profit, or due to business interruption) arising out of the use or inability 
          to use the materials on GlobalCart Online Shop's website, even if GlobalCart Online Shop or a 
          GlobalCart Online Shop authorized representative has been notified orally or in writing of the 
          possibility of such damage.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">5. Governing Law</h2>
        <p className="mb-4">
          These terms and conditions are governed by and construed in accordance with the laws of Singapore 
          and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4">6. Contact Us</h2>
        <p className="mb-4">
          If you have any questions about these Terms of Service, please contact us at: support@globalcart-onlineshop.com
        </p>
      </div>
    </div>
  );
}
