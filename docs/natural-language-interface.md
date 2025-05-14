# Natural Language Interface Documentation

## Overview

The Natural Language Interface in Data Modeler Cloud allows users to modify data models using plain English instructions. This feature makes data modeling more accessible by enabling users to describe what they want to do in natural language, rather than having to navigate through the UI to perform specific actions.

## Setup Requirements

To use the Natural Language Interface, you need to configure an OpenAI API key:

1. Sign up for an OpenAI account at [https://platform.openai.com/signup](https://platform.openai.com/signup) if you don't have one
2. Generate an API key from the [OpenAI dashboard](https://platform.openai.com/api-keys)
3. Add the API key to your `.env.local` file:

```
OPENAI_API_KEY=your-api-key-here
```

4. Restart the development server for the changes to take effect

## Features

- **Conversational Interface**: Interact with your data model through a chat-like interface
- **Visual Preview**: See a preview of changes before they are applied to your data model
- **Intelligent Understanding**: The system understands your intent and can ask follow-up questions when more information is needed
- **Comprehensive Coverage**: Supports all major data modeling operations including:
  - Creating, modifying, and deleting entities
  - Adding, updating, and removing attributes
  - Creating foreign keys and relationships
  - Defining referentials and rules

## How to Use

1. Navigate to the Natural Language Interface by clicking on the "Natural Language" link in the sidebar when viewing a data model
2. Type your request in plain English in the text area at the bottom of the interface
3. The system will process your request and may ask follow-up questions if more information is needed
4. When changes are ready to be applied, you'll see a preview showing what will be modified
5. Review the changes and click "Apply Changes" to implement them, or "Cancel" to discard them

## Example Instructions

Here are some examples of instructions you can give:

### Entity Operations

- "Create a new entity called Customer"
- "Add an entity named Product with attributes name, price, and description"
- "Delete the Order entity"
- "Rename the User entity to Member"

### Join Entity Operations

- "Create a join entity between Student and Course"
- "Make a junction table linking Product and Category called ProductCategory"
- "Create a many-to-many relationship between Employee and Project using a join entity"
- "Add a join entity called OrderItem to connect Order and Product"

### Attribute Operations

- "Add an email attribute to the Customer entity"
- "Create a price attribute in the Product entity with type decimal"
- "Add a required and unique email attribute to the Customer entity"
- "Create an age attribute of type integer in the User entity with a default value of 18"
- "Add a description attribute with length 500 to the Product entity"
- "Make the email attribute required and unique"
- "Remove the address attribute from Customer"
- "Change the data type of the price attribute to integer"

### Relationship Operations

- "Create a relationship between Customer and Order"
- "Add a one-to-many relationship from Product to OrderItem"
- "Create a join entity between Product and Order called OrderItem"
- "Set the cardinality of the Customer-Order relationship to one-to-many"

### Referential Operations

- "Create a new referential called Sales Process"
- "Add the Order and Payment entities to the Sales Process referential"
- "Change the color of the User Management referential to blue"

### Rule Operations

- "Add a validation rule to ensure the email attribute is properly formatted"
- "Create a business rule that requires orders over $1000 to have manager approval"
- "Add a rule to ensure the price is always positive"

## Best Practices

1. **Be Specific**: Provide as much detail as possible in your instructions
2. **Start Simple**: Begin with simple operations and build complexity as you become more familiar with the system
3. **Review Changes**: Always review the preview before applying changes
4. **Iterative Approach**: For complex changes, consider breaking them down into multiple steps

## Technical Details

The Natural Language Interface uses advanced AI technology to:

1. Parse and understand your natural language instructions
2. Identify the specific operations you want to perform
3. Gather any additional information needed through follow-up questions
4. Generate a preview of the changes
5. Apply the changes to your data model using the existing CRUD APIs

## Limitations

- Very complex or ambiguous instructions may require clarification
- The system works best with clear, concise instructions
- Some advanced modeling concepts may require specific terminology

## Troubleshooting

If you encounter issues with the Natural Language Interface, try the following steps:

1. **Check your OpenAI API key**: Ensure that your API key is correctly added to the `.env.local` file as `OPENAI_API_KEY=your-key-here`
2. **Restart the server**: After adding or updating the API key, restart the development server
3. **Check the console**: Open your browser's developer tools (F12) and check the console for error messages
4. **Verify API key validity**: Make sure your OpenAI API key is valid and has not expired
5. **Check API quota**: Ensure you have not exceeded your OpenAI API usage quota

### Common Error Messages

- **"OpenAI API key not configured"**: Add your OpenAI API key to the `.env.local` file
- **"Authentication error"**: Your API key may be invalid or expired
- **"Rate limit exceeded"**: You've exceeded your OpenAI API rate limit

## Feedback and Improvements

We're continuously improving the Natural Language Interface. If you encounter any issues or have suggestions for improvement, please provide feedback through the application's feedback mechanism.
