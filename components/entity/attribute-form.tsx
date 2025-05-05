"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusIcon, TrashIcon } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

export interface AttributeFormData {
  id?: string;
  name: string;
  description: string;
  dataType: string;
  length?: number;
  minLength?: number;
  precision?: number;
  scale?: number;
  isRequired: boolean;
  isUnique: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedEntity?: string;
  referencedAttribute?: string;
  onDeleteAction?: string;
  onUpdateAction?: string;
  formatValidation?: string;
  searchable?: boolean;
  caseSensitive?: boolean;
  indexable?: boolean;
}

interface AttributeFormProps {
  attributes: AttributeFormData[];
  onAttributeChange: (attributes: AttributeFormData[]) => void;
  primaryKeyInfo: {
    type: string;
    name: string;
  };
}

const DATA_TYPES = [
  { value: "integer", label: "Integer" },
  { value: "bigint", label: "Big Integer" },
  { value: "decimal", label: "Decimal" },
  { value: "float", label: "Float" },
  { value: "double", label: "Double" },
  { value: "varchar", label: "Varchar" },
  { value: "char", label: "Char" },
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "DateTime" },
  { value: "timestamp", label: "Timestamp" },
  { value: "boolean", label: "Boolean" },
  { value: "uuid", label: "UUID" },
  { value: "json", label: "JSON" },
  { value: "jsonb", label: "JSONB" },
  { value: "array", label: "Array" },
  { value: "enum", label: "Enum" },
];

const REFERENTIAL_ACTIONS = [
  { value: "CASCADE", label: "CASCADE - Delete/update related records" },
  { value: "SET NULL", label: "SET NULL - Set foreign key to NULL" },
  { value: "RESTRICT", label: "RESTRICT - Prevent deletion/update if references exist" },
  { value: "NO ACTION", label: "NO ACTION - Similar to RESTRICT" },
  { value: "SET DEFAULT", label: "SET DEFAULT - Set foreign key to default value" },
];

export default function AttributeForm({
  attributes,
  onAttributeChange,
  primaryKeyInfo,
}: AttributeFormProps) {
  const [showAdvanced, setShowAdvanced] = useState<{ [key: string]: boolean }>({});

  // Add primary key attribute if it doesn't exist yet
  useState(() => {
    if (attributes.length === 0 && primaryKeyInfo.type !== "composite") {
      const newAttributes = [...attributes];
      newAttributes.push({
        name: primaryKeyInfo.name,
        description: "Primary key",
        dataType: primaryKeyInfo.type === "uuid" ? "uuid" : "integer",
        isRequired: true,
        isUnique: true,
        isPrimaryKey: true,
        isForeignKey: false,
      });
      onAttributeChange(newAttributes);
    }
  });

  const handleAddAttribute = () => {
    const newAttributes = [...attributes];
    newAttributes.push({
      name: "",
      description: "",
      dataType: "varchar",
      isRequired: false,
      isUnique: false,
      isPrimaryKey: false,
      isForeignKey: false,
    });
    onAttributeChange(newAttributes);
  };

  const handleAddForeignKey = () => {
    const newAttributes = [...attributes];
    newAttributes.push({
      name: "",
      description: "Foreign key reference",
      dataType: "integer",
      isRequired: false,
      isUnique: false,
      isPrimaryKey: false,
      isForeignKey: true,
      referencedEntity: "",
      referencedAttribute: "",
      onDeleteAction: "RESTRICT",
      onUpdateAction: "RESTRICT",
    });
    onAttributeChange(newAttributes);
  };

  const handleRemoveAttribute = (index: number) => {
    const newAttributes = [...attributes];
    newAttributes.splice(index, 1);
    onAttributeChange(newAttributes);
  };

  const handleAttributeChange = (index: number, field: string, value: unknown) => {
    const newAttributes = [...attributes];
    newAttributes[index] = {
      ...newAttributes[index],
      [field]: value,
    };
    onAttributeChange(newAttributes);
  };

  const toggleAdvanced = (index: number) => {
    setShowAdvanced((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddForeignKey}
          className="flex items-center gap-1"
        >
          <PlusIcon size={16} />
          Add Foreign Key
        </Button>
      </div>

      {attributes.length === 0 ? (
        <div className="text-center p-6 border rounded-md bg-muted/20">
          <p className="text-muted-foreground">No attributes defined yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attributes.map((attribute, index) => (
            <Card key={index} className={attribute.isForeignKey ? "border-blue-200 bg-blue-50/30 dark:bg-blue-950/10" : ""}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {attribute.isPrimaryKey && (
                        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-md font-medium">
                          Primary Key
                        </span>
                      )}
                      {attribute.isForeignKey && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-md font-medium">
                          Foreign Key
                        </span>
                      )}
                      {!attribute.isPrimaryKey && !attribute.isForeignKey && attribute.name && (
                        <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 px-2 py-0.5 rounded-md font-medium">
                          Attribute
                        </span>
                      )}
                    </CardTitle>
                    {attribute.name && (
                      <CardDescription>
                        {attribute.name} ({attribute.dataType})
                      </CardDescription>
                    )}
                  </div>
                  {!attribute.isPrimaryKey && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAttribute(index)}
                      className="h-8 w-8 text-destructive"
                    >
                      <TrashIcon size={16} />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`name-${index}`}>Name</Label>
                    <Input
                      id={`name-${index}`}
                      value={attribute.name}
                      onChange={(e) =>
                        handleAttributeChange(index, "name", e.target.value)
                      }
                      placeholder="e.g. first_name, email, price"
                      disabled={attribute.isPrimaryKey}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dataType-${index}`}>Data Type</Label>
                    <Select
                      value={attribute.dataType}
                      onValueChange={(value) =>
                        handleAttributeChange(index, "dataType", value)
                      }
                      disabled={attribute.isPrimaryKey && primaryKeyInfo.type !== "custom"}
                    >
                      <SelectTrigger id={`dataType-${index}`}>
                        <SelectValue placeholder="Select data type" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATA_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Length/Precision fields for certain data types */}
                {(attribute.dataType === "varchar" || 
                  attribute.dataType === "char") && (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor={`length-${index}`}>Length</Label>
                    <Input
                      id={`length-${index}`}
                      type="number"
                      value={attribute.length || ""}
                      onChange={(e) =>
                        handleAttributeChange(
                          index,
                          "length",
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      placeholder="e.g. 255"
                    />
                  </div>
                )}

                {(attribute.dataType === "decimal" || 
                  attribute.dataType === "float" || 
                  attribute.dataType === "double") && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`precision-${index}`}>Precision</Label>
                      <Input
                        id={`precision-${index}`}
                        type="number"
                        value={attribute.precision || ""}
                        onChange={(e) =>
                          handleAttributeChange(
                            index,
                            "precision",
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="e.g. 10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`scale-${index}`}>Scale</Label>
                      <Input
                        id={`scale-${index}`}
                        type="number"
                        value={attribute.scale || ""}
                        onChange={(e) =>
                          handleAttributeChange(
                            index,
                            "scale",
                            e.target.value ? parseInt(e.target.value) : undefined
                          )
                        }
                        placeholder="e.g. 2"
                      />
                    </div>
                  </div>
                )}

                {/* Foreign Key specific fields */}
                {attribute.isForeignKey && (
                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`referencedEntity-${index}`}>Referenced Entity</Label>
                        <Input
                          id={`referencedEntity-${index}`}
                          value={attribute.referencedEntity || ""}
                          onChange={(e) =>
                            handleAttributeChange(index, "referencedEntity", e.target.value)
                          }
                          placeholder="e.g. users"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`referencedAttribute-${index}`}>Referenced Attribute</Label>
                        <Input
                          id={`referencedAttribute-${index}`}
                          value={attribute.referencedAttribute || ""}
                          onChange={(e) =>
                            handleAttributeChange(index, "referencedAttribute", e.target.value)
                          }
                          placeholder="e.g. id"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`onDeleteAction-${index}`}>On Delete</Label>
                        <Select
                          value={attribute.onDeleteAction || "RESTRICT"}
                          onValueChange={(value) =>
                            handleAttributeChange(index, "onDeleteAction", value)
                          }
                        >
                          <SelectTrigger id={`onDeleteAction-${index}`}>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERENTIAL_ACTIONS.map((action) => (
                              <SelectItem key={action.value} value={action.value}>
                                {action.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`onUpdateAction-${index}`}>On Update</Label>
                        <Select
                          value={attribute.onUpdateAction || "RESTRICT"}
                          onValueChange={(value) =>
                            handleAttributeChange(index, "onUpdateAction", value)
                          }
                        >
                          <SelectTrigger id={`onUpdateAction-${index}`}>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {REFERENTIAL_ACTIONS.map((action) => (
                              <SelectItem key={action.value} value={action.value}>
                                {action.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`isRequired-${index}`}
                      checked={attribute.isRequired}
                      onCheckedChange={(checked) =>
                        handleAttributeChange(index, "isRequired", !!checked)
                      }
                      disabled={attribute.isPrimaryKey}
                    />
                    <Label
                      htmlFor={`isRequired-${index}`}
                      className="text-sm font-normal"
                    >
                      Required
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`isUnique-${index}`}
                      checked={attribute.isUnique}
                      onCheckedChange={(checked) =>
                        handleAttributeChange(index, "isUnique", !!checked)
                      }
                      disabled={attribute.isPrimaryKey}
                    />
                    <Label
                      htmlFor={`isUnique-${index}`}
                      className="text-sm font-normal"
                    >
                      Unique
                    </Label>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-8 text-xs"
                  onClick={() => toggleAdvanced(index)}
                >
                  {showAdvanced[index] ? "Hide Advanced" : "Show Advanced"}
                </Button>

                {showAdvanced[index] && (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        value={attribute.description}
                        onChange={(e) =>
                          handleAttributeChange(index, "description", e.target.value)
                        }
                        placeholder="Describe this attribute"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`defaultValue-${index}`}>Default Value</Label>
                      <Input
                        id={`defaultValue-${index}`}
                        value={attribute.defaultValue || ""}
                        onChange={(e) =>
                          handleAttributeChange(index, "defaultValue", e.target.value)
                        }
                        placeholder="e.g. 0, 'Unknown', CURRENT_TIMESTAMP"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
