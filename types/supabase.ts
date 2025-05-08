export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      data_models: {
        Row: {
          id: string
          name: string
          description: string | null
          project_id: string
          version: string
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          project_id: string
          version?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          project_id?: string
          version?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_models_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_models_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          }
        ]
      }
      entities: {
        Row: {
          id: string
          name: string
          description: string | null
          data_model_id: string
          created_at: string
          updated_at: string
          referential_id: string | null
          position_x: number | null
          position_y: number | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          data_model_id: string
          created_at?: string
          updated_at?: string
          referential_id?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          data_model_id?: string
          created_at?: string
          updated_at?: string
          referential_id?: string | null
          position_x?: number | null
          position_y?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entities_referential_id_fkey"
            columns: ["referential_id"]
            referencedRelation: "referentials"
            referencedColumns: ["id"]
          }
        ]
      }
      attributes: {
        Row: {
          id: string
          name: string
          description: string | null
          data_type: string
          entity_id: string
          is_primary_key: boolean
          is_required: boolean
          is_unique: boolean
          default_value: string | null
          length: number | null
          created_at: string
          updated_at: string
          is_foreign_key: boolean
          referenced_entity_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          data_type: string
          entity_id: string
          is_primary_key?: boolean
          is_required?: boolean
          is_unique?: boolean
          default_value?: string | null
          length?: number | null
          created_at?: string
          updated_at?: string
          is_foreign_key?: boolean
          referenced_entity_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          data_type?: string
          entity_id?: string
          is_primary_key?: boolean
          is_required?: boolean
          is_unique?: boolean
          default_value?: string | null
          length?: number | null
          created_at?: string
          updated_at?: string
          is_foreign_key?: boolean
          referenced_entity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attributes_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributes_referenced_entity_id_fkey"
            columns: ["referenced_entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          }
        ]
      }
      relationships: {
        Row: {
          id: string
          data_model_id: string
          source_entity_id: string
          target_entity_id: string
          source_attribute_id: string | null
          target_attribute_id: string | null
          relationship_type: "one-to-one" | "one-to-many" | "many-to-many"
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          data_model_id: string
          source_entity_id: string
          target_entity_id: string
          source_attribute_id?: string | null
          target_attribute_id?: string | null
          relationship_type: "one-to-one" | "one-to-many" | "many-to-many"
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          data_model_id?: string
          source_entity_id?: string
          target_entity_id?: string
          source_attribute_id?: string | null
          target_attribute_id?: string | null
          relationship_type?: "one-to-one" | "one-to-many" | "many-to-many"
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_attribute_id_fkey"
            columns: ["source_attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_attribute_id_fkey"
            columns: ["target_attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          content: string
          user_id: string
          entity_id: string | null
          attribute_id: string | null
          relationship_id: string | null
          data_model_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          user_id: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          data_model_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          user_id?: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          data_model_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_attribute_id_fkey"
            columns: ["attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_relationship_id_fkey"
            columns: ["relationship_id"]
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referentials: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      rules: {
        Row: {
          id: string
          name: string
          description: string | null
          rule_type: "validation" | "business" | "automation"
          entity_id: string | null
          attribute_id: string | null
          data_model_id: string | null
          condition_expression: string | null
          action_expression: string | null
          severity: "error" | "warning" | "info" | null
          is_enabled: boolean
          dependencies: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          rule_type: "validation" | "business" | "automation"
          entity_id?: string | null
          attribute_id?: string | null
          data_model_id?: string | null
          condition_expression?: string | null
          action_expression?: string | null
          severity?: "error" | "warning" | "info" | null
          is_enabled?: boolean
          dependencies?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          rule_type?: "validation" | "business" | "automation"
          entity_id?: string | null
          attribute_id?: string | null
          data_model_id?: string | null
          condition_expression?: string | null
          action_expression?: string | null
          severity?: "error" | "warning" | "info" | null
          is_enabled?: boolean
          dependencies?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rules_attribute_id_fkey"
            columns: ["attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          }
        ]
      }
      validation_roles: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_validation_roles: {
        Row: {
          id: string
          user_id: string
          validation_role_id: string
          project_id: string
          data_model_id: string | null
          component_scope: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          validation_role_id: string
          project_id: string
          data_model_id?: string | null
          component_scope?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          validation_role_id?: string
          project_id?: string
          data_model_id?: string | null
          component_scope?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_validation_roles_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_validation_roles_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_validation_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_validation_roles_validation_role_id_fkey"
            columns: ["validation_role_id"]
            referencedRelation: "validation_roles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
