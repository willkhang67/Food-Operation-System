{{ config(
    materialized='table'
) }}

with source as (
    select * from {{ source('landing', 'payments') }}
)

select
    id as payment_id,
    order_id,
    amount,
    status as payment_status,
    created_at,
    updated_at
from source
