{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'orders') }}
)

select
    id as order_id,
    customer_id,
    status as order_status,
    total_amount,
    notes,
    created_at,
    updated_at
from source
