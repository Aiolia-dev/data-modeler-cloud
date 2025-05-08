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
          role: 'owner' | 'editor' | 'viewer'
          joined_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'owner' | 'editor' | 'viewer'
          joined_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'editor' | 'viewer'
          joined_at?: string
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
          project_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          version: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          version?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_models_project_id_fkey"
            columns: ["project_id"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_models_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      entities: {
        Row: {
          id: string
          data_model_id: string
          name: string
          description: string | null
          position_x: number
          position_y: number
          created_at: string
          updated_at: string
          referential_id: string | null
        }
        Insert: {
          id?: string
          data_model_id: string
          name: string
          description?: string | null
          position_x?: number
          position_y?: number
          created_at?: string
          updated_at?: string
          referential_id?: string | null
        }
        Update: {
          id?: string
          data_model_id?: string
          name?: string
          description?: string | null
          position_x?: number
          position_y?: number
          created_at?: string
          updated_at?: string
          referential_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entities_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          }
        ]
      }
      attributes: {
        Row: {
          id: string
          entity_id: string
          name: string
          data_type: string
          description: string | null
          is_primary_key: boolean
          is_foreign_key: boolean
          is_unique: boolean
          is_mandatory: boolean
          is_calculated: boolean
          calculation_rule: string | null
          dependent_attribute_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          entity_id: string
          name: string
          data_type: string
          description?: string | null
          is_primary_key?: boolean
          is_foreign_key?: boolean
          is_unique?: boolean
          is_mandatory?: boolean
          is_calculated?: boolean
          calculation_rule?: string | null
          dependent_attribute_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          entity_id?: string
          name?: string
          data_type?: string
          description?: string | null
          is_primary_key?: boolean
          is_foreign_key?: boolean
          is_unique?: boolean
          is_mandatory?: boolean
          is_calculated?: boolean
          calculation_rule?: string | null
          dependent_attribute_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attributes_dependent_attribute_id_fkey"
            columns: ["dependent_attribute_id"]
            referencedRelation: "attributes"
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
          relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many'
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
          relationship_type: 'one-to-one' | 'one-to-many' | 'many-to-many'
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
          relationship_type?: 'one-to-one' | 'one-to-many' | 'many-to-many'
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
            foreignKeyName: "relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_attribute_id_fkey"
            columns: ["source_attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_attribute_id_fkey"
            columns: ["target_attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          }
        ]
      }
      comments: {
        Row: {
          id: string
          entity_id: string | null
          attribute_id: string | null
          relationship_id: string | null
          user_id: string | null
          content: string
          created_at: string
          updated_at: string
          position_x: number | null
          position_y: number | null
          data_model_id: string | null
          user_email: string | null
        }
        Insert: {
          id?: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          user_id?: string | null
          content: string
          created_at?: string
          updated_at?: string
          position_x?: number | null
          position_y?: number | null
          data_model_id?: string | null
          user_email?: string | null
        }
        Update: {
          id?: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          user_id?: string | null
          content?: string
          created_at?: string
          updated_at?: string
          position_x?: number | null
          position_y?: number | null
          data_model_id?: string | null
          user_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_attribute_id_fkey"
            columns: ["attribute_id"]
            referencedRelation: "attributes"
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
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          data_model_id: string
          entity_id: string | null
          attribute_id: string | null
          relationship_id: string | null
          action_type: 'create' | 'update' | 'delete'
          previous_value: Json | null
          new_value: Json | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          data_model_id: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          action_type: 'create' | 'update' | 'delete'
          previous_value?: Json | null
          new_value?: Json | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          data_model_id?: string
          entity_id?: string | null
          attribute_id?: string | null
          relationship_id?: string | null
          action_type?: 'create' | 'update' | 'delete'
          previous_value?: Json | null
          new_value?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_data_model_id_fkey"
            columns: ["data_model_id"]
            referencedRelation: "data_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_attribute_id_fkey"
            columns: ["attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_relationship_id_fkey"
            columns: ["relationship_id"]
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          }
        ]
      },
      rules: {
        Row: {
          id: string
          name: string
          description: string | null
          rule_type: 'validation' | 'business' | 'automation'
          entity_id: string | null
          attribute_id: string | null
          condition_expression: string
          action_expression: string
          severity: 'error' | 'warning' | 'info' | null
          is_enabled: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          rule_type: 'validation' | 'business' | 'automation'
          entity_id?: string | null
          attribute_id?: string | null
          condition_expression: string
          action_expression: string
          severity?: 'error' | 'warning' | 'info' | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          rule_type?: 'validation' | 'business' | 'automation'
          entity_id?: string | null
          attribute_id?: string | null
          condition_expression?: string
          action_expression?: string
          severity?: 'error' | 'warning' | 'info' | null
          is_enabled?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rules_entity_id_fkey"
            columns: ["entity_id"]
            referencedRelation: "entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_attribute_id_fkey"
            columns: ["attribute_id"]
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rules_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "users"
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
