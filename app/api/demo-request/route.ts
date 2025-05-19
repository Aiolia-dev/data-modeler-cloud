import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { firstName, lastName, companyName, companyWebsite, email, phoneNumber } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 }
      );
    }

    // Get the recipient email from environment variables
    const recipientEmail = process.env.DEMO_REQUEST_EMAIL;

    if (!recipientEmail) {
      console.error("DEMO_REQUEST_EMAIL environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Configure email transport
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Create email content
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject: `Demo Request from ${firstName} ${lastName} - ${companyName || ""}`,
      html: `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phoneNumber || "Not provided"}</p>
        <p><strong>Company:</strong> ${companyName || "Not provided"}</p>
        <p><strong>Website:</strong> ${companyWebsite || "Not provided"}</p>
        <hr>
        <p>This request was submitted from the Data Modeler Cloud website on ${new Date().toLocaleString()}</p>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    // Return success response
    return NextResponse.json(
      { success: true, message: "Demo request submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending demo request:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
