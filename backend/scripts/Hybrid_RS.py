#!/usr/bin/env python
# coding: utf-8

# In[ ]:


# Cell 1: Khởi tạo và Cấu hình

import os
import logging
from typing import List, Dict, Tuple, Union
from sqlalchemy import create_engine, text, Column, Integer, Float, String, DateTime , ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import ParameterGrid
from collections import defaultdict
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns # Thêm seaborn để biểu đồ đẹp hơn
from sklearn.feature_extraction.text import TfidfVectorizer # Thêm import này cho Content-based
from sklearn.preprocessing import MultiLabelBinarizer # Thêm import này cho Content-based
import requests # THÊM IMPORT NÀY ĐỂ GỌI API
import json
# === CONFIGURATION ===
# Các biến môi trường cho DB vẫn giữ nguyên để kết nối cơ sở dữ liệu
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '') # THAY THẾ BẰNG PASSWORD CỦA BẠN NẾU CÓ
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'thesis')

# URL của API Laravel để lấy cấu hình
LARAVEL_SETTINGS_API_URL = os.getenv('LARAVEL_SETTINGS_API_URL', 'http://localhost:8000/api/recommender/settings')

# === LOGGING SETUP ===
# Thiết lập logger để hiển thị thông báo
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Hàm để tải cấu hình từ API Laravel
def load_recommender_settings_from_api(api_url: str) -> Dict[str, Union[int, float, str]]:
    """
    Tải các cài đặt của hệ thống gợi ý từ API Laravel.
    """
    logger.info(f"Đang tải cấu hình hệ thống gợi ý từ API: {api_url}")
    settings = {}
    try:
        response = requests.get(api_url)
        response.raise_for_status() # Ném lỗi cho các mã trạng thái HTTP xấu (4xx hoặc 5xx)
        api_data = response.json()

        if api_data.get('status') == 'success' and 'data' in api_data:
            for setting_item in api_data['data']:
                key = setting_item['key']
                value_str = setting_item['value']
                data_type = setting_item['data_type']

                # Chuyển đổi giá trị sang kiểu dữ liệu phù hợp
                if data_type == 'integer':
                    settings[key] = int(value_str)
                elif data_type == 'float':
                    settings[key] = float(value_str)
                elif key == 'PRODUCT_BLACKLIST' and data_type == 'string': # Hoặc data_type == 'text'
                    try:
                        # Tách chuỗi bằng dấu phẩy và chuyển đổi từng phần tử sang int
                        settings[key] = [int(item.strip()) for item in value_str.split(',') if item.strip()]
                        logger.info(f"Đã parse PRODUCT_BLACKLIST từ chuỗi '{value_str}' thành list: {settings[key]}")
                    except ValueError:
                        logger.warning(f"Không thể parse PRODUCT_BLACKLIST từ chuỗi '{value_str}' thành list số nguyên. Sử dụng rỗng.")
                        settings[key] = [] # Mặc định là list rỗng nếu parse lỗi
                else: # Mặc định là string hoặc các kiểu khác
                    settings[key] = value_str
            logger.info(f"Đã tải thành công {len(settings)} cài đặt từ API.")
        else:
            logger.error(f"API trả về trạng thái không thành công hoặc thiếu dữ liệu: {api_data.get('message', 'Không có thông báo.')}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Lỗi khi kết nối đến API Laravel: {e}. Sử dụng các giá trị mặc định.")
    except Exception as e:
        logger.error(f"Lỗi không xác định khi tải cấu hình từ API: {e}. Sử dụng các giá trị mặc định.")

    # Cung cấp các giá trị mặc định nếu API không thể tải hoặc có lỗi
    default_settings = {
        'BATCH_SIZE': 500,
        'TOP_K': 10,
        'TOP_N_RECOMMENDATIONS': 10,
        'COSINE_THRESHOLD': 0.1,
        'HYBRID_ALPHA': 0.5,
        'PRODUCT_BLACKLIST': [] # Ví dụ mặc định cho blacklist
    }
    # Gộp các cài đặt đã tải với các giá trị mặc định (ưu tiên cài đặt từ API)
    final_settings = {**default_settings, **settings}
    return final_settings

# Tải cấu hình ngay khi script bắt đầu
APP_SETTINGS = load_recommender_settings_from_api(LARAVEL_SETTINGS_API_URL)

# Gán các biến cấu hình từ APP_SETTINGS
BATCH_SIZE = APP_SETTINGS['BATCH_SIZE']
TOP_K = APP_SETTINGS['TOP_K']
TOP_N_RECOMMENDATIONS = APP_SETTINGS['TOP_N_RECOMMENDATIONS']
COSINE_THRESHOLD = APP_SETTINGS['COSINE_THRESHOLD']
HYBRID_ALPHA = APP_SETTINGS['HYBRID_ALPHA']
# Nếu có thêm các cài đặt khác, bạn cũng cần gán chúng ở đây
PRODUCT_BLACKLIST = APP_SETTINGS.get('PRODUCT_BLACKLIST', []) # Đảm bảo có giá trị mặc định nếu không có trong DB

# === DATABASE SETUP ===
Base = declarative_base()
# Sử dụng các biến DB_USER, DB_PASS, DB_HOST, DB_NAME từ os.getenv
engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}")
SessionLocal = sessionmaker(bind=engine)

# === MODELS ===
class UserEvent(Base):
    __tablename__ = 'user_events'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    product_id = Column(Integer, nullable=False)
    event_type = Column(String(50), nullable=False)
    created_at = Column(DateTime) # Changed to DateTime for proper parsing

class ItemSimilarity(Base):
    __tablename__ = 'item_similarity'
    product_id_1 = Column(Integer, primary_key=True)
    product_id_2 = Column(Integer, primary_key=True)
    score = Column(Float)
    cf_score = Column(Float)
    content_score = Column(Float)


# EAV Models (as per your PHP models)

class Category(Base):
    __tablename__ = 'categories' # Giả sử tên bảng là 'categories'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    # Có thể thêm các cột khác nếu cần, ví dụ 'slug'

class Brand(Base):
    __tablename__ = 'brands' # Giả sử tên bảng là 'brands'
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    # Có thể thêm các cột khác nếu cần

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True) # Đổi product_id thành id để phù hợp Laravel
    name = Column(String(255), nullable=False)
    slug = Column(String(255))
    description = Column(String(1000))
    cat_id = Column(Integer, ForeignKey('categories.id'))
    brand_id = Column(Integer, ForeignKey('brands.id'))
    is_featured = Column(Integer) # Giả sử là tinyint hoặc boolean
    status = Column(String(50))

    # Relationships (optional for this specific task, but good practice)
    category = relationship("Category")
    brand = relationship("Brand")
    variants = relationship("Variant", back_populates="product")


class Variant(Base):
    __tablename__ = 'product_variants' # Tên bảng của bạn
    id = Column(Integer, primary_key=True) # ID của variant
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    sku = Column(String(255))
    price = Column(Float)
    discount = Column(Float)
    stock = Column(Integer)
    image = Column(String(255))
    status = Column(String(50))
    
    product = relationship("Product", back_populates="variants")
    variant_spec_values = relationship("VariantSpecValue", back_populates="variant")

class Specification(Base):
    __tablename__ = 'specifications'
    id = Column(Integer, primary_key=True) # spec_id
    category_id = Column(Integer, ForeignKey('categories.id'))
    name = Column(String(255), nullable=False) # e.g., "Màu sắc", "RAM", "Dung lượng bộ nhớ", "Kích thước màn hình"
    data_type = Column(String(50)) # e.g., "text", "int", "decimal", "option"
    unit = Column(String(50)) # e.g., "GB", "inch"
    
    category = relationship("Category")
    spec_options = relationship("SpecOption", back_populates="specification")
    variant_spec_values = relationship("VariantSpecValue", back_populates="specification")

class SpecOption(Base):
    __tablename__ = 'spec_options'
    id = Column(Integer, primary_key=True) # option_id
    spec_id = Column(Integer, ForeignKey('specifications.id'), nullable=False)
    value = Column(String(255), nullable=False) # e.g., "Đen", "Bạc", "8GB"

    specification = relationship("Specification", back_populates="spec_options")

class VariantSpecValue(Base):
    __tablename__ = 'variant_spec_values'
    id = Column(Integer, primary_key=True)
    variant_id = Column(Integer, ForeignKey('product_variants.id'), nullable=False)
    spec_id = Column(Integer, ForeignKey('specifications.id'), nullable=False)
    value_text = Column(String(255))
    value_int = Column(Integer)
    value_decimal = Column(Float)
    option_id = Column(Integer, ForeignKey('spec_options.id')) # Đối với các thuộc tính có lựa chọn (e.g., Màu sắc)

    variant = relationship("Variant", back_populates="variant_spec_values")
    specification = relationship("Specification", back_populates="variant_spec_values")
    spec_option = relationship("SpecOption") # Tên hàm quan hệ là spec_option (singular)


print("--- Khởi tạo hệ thống và cấu hình hoàn tất ---")
print(f"Cơ sở dữ liệu đang kết nối: {DB_HOST}/{DB_NAME}")
print(f"Cài đặt hệ thống gợi ý đã tải: {APP_SETTINGS}") # In ra các cài đặt đã tải để kiểm tra


# # Cell 1: Khởi tạo và Cấu hình

# import os
# import logging
# from typing import List, Dict, Tuple, Union
# from sqlalchemy import create_engine, text, Column, Integer, Float, String, DateTime , ForeignKey 
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker, relationship
# import pandas as pd
# import numpy as np
# from scipy.sparse import csr_matrix
# from sklearn.metrics.pairwise import cosine_similarity
# from sklearn.model_selection import ParameterGrid
# from collections import defaultdict
# from datetime import datetime
# import matplotlib.pyplot as plt
# import seaborn as sns # Thêm seaborn để biểu đồ đẹp hơn
# from sklearn.feature_extraction.text import TfidfVectorizer # Thêm import này cho Content-based
# from sklearn.preprocessing import MultiLabelBinarizer # Thêm import này cho Content-based

# # === CONFIGURATION ===
# # Đảm bảo các biến môi trường này được thiết lập hoặc sử dụng giá trị mặc định
# DB_USER = os.getenv('DB_USER', 'root')
# DB_PASS = os.getenv('DB_PASS', '') # THAY THẾ BẰNG PASSWORD CỦA BẠN NẾU CÓ
# DB_HOST = os.getenv('DB_HOST', 'localhost')
# DB_NAME = os.getenv('DB_NAME', 'thesis')
# BATCH_SIZE = int(os.getenv('BATCH_SIZE', 500))
# TOP_K = int(os.getenv('TOP_K', 10))  # lưu top-k similar items (for item-item similarity)
# TOP_N_RECOMMENDATIONS = int(os.getenv('TOP_N_RECOMMENDATIONS', 10)) # top-n recommendations for user
# COSINE_THRESHOLD = float(os.getenv('COSINE_THRESHOLD', 0.1)) # Giảm threshold để có nhiều item tương đồng hơn cho việc đánh giá ban đầu
# HYBRID_ALPHA = float(os.getenv('HYBRID_ALPHA', 0.5)) # Trọng số cho Collaborative Filtering. Content-based sẽ là (1 - alpha)

# # === LOGGING SETUP ===
# # Thiết lập logger để hiển thị thông báo
# logging.basicConfig(
#     level=logging.INFO,
#     format='%(asctime)s - %(levelname)s - %(message)s'
# )
# logger = logging.getLogger(__name__)

# # === DATABASE SETUP ===
# Base = declarative_base()
# engine = create_engine(f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}/{DB_NAME}")
# SessionLocal = sessionmaker(bind=engine)

# # === MODELS ===
# class UserEvent(Base):
#     __tablename__ = 'user_events'
#     id = Column(Integer, primary_key=True, autoincrement=True)
#     user_id = Column(Integer, nullable=False)
#     product_id = Column(Integer, nullable=False)
#     event_type = Column(String(50), nullable=False)
#     created_at = Column(DateTime) # Changed to DateTime for proper parsing

# class ItemSimilarity(Base):
#     __tablename__ = 'item_similarity'
#     product_id_1 = Column(Integer, primary_key=True)
#     product_id_2 = Column(Integer, primary_key=True)
#     score = Column(Float)
#     cf_score = Column(Float)
#     content_score = Column(Float)


# # EAV Models (as per your PHP models)

# class Category(Base):
#     __tablename__ = 'categories' # Giả sử tên bảng là 'categories'
#     id = Column(Integer, primary_key=True)
#     name = Column(String(255), nullable=False)
#     # Có thể thêm các cột khác nếu cần, ví dụ 'slug'

# class Brand(Base):
#     __tablename__ = 'brands' # Giả sử tên bảng là 'brands'
#     id = Column(Integer, primary_key=True)
#     name = Column(String(255), nullable=False)
#     # Có thể thêm các cột khác nếu cần

# class Product(Base):
#     __tablename__ = 'products'
#     id = Column(Integer, primary_key=True) # Đổi product_id thành id để phù hợp Laravel
#     name = Column(String(255), nullable=False)
#     slug = Column(String(255))
#     description = Column(String(1000))
#     cat_id = Column(Integer, ForeignKey('categories.id'))
#     brand_id = Column(Integer, ForeignKey('brands.id'))
#     is_featured = Column(Integer) # Giả sử là tinyint hoặc boolean
#     status = Column(String(50))

#     # Relationships (optional for this specific task, but good practice)
#     category = relationship("Category")
#     brand = relationship("Brand")
#     variants = relationship("Variant", back_populates="product")


# class Variant(Base):
#     __tablename__ = 'product_variants' # Tên bảng của bạn
#     id = Column(Integer, primary_key=True) # ID của variant
#     product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
#     sku = Column(String(255))
#     price = Column(Float)
#     discount = Column(Float)
#     stock = Column(Integer)
#     image = Column(String(255))
#     status = Column(String(50))
    
#     product = relationship("Product", back_populates="variants")
#     variant_spec_values = relationship("VariantSpecValue", back_populates="variant")

# class Specification(Base):
#     __tablename__ = 'specifications'
#     id = Column(Integer, primary_key=True) # spec_id
#     category_id = Column(Integer, ForeignKey('categories.id'))
#     name = Column(String(255), nullable=False) # e.g., "Màu sắc", "RAM", "Dung lượng bộ nhớ", "Kích thước màn hình"
#     data_type = Column(String(50)) # e.g., "text", "int", "decimal", "option"
#     unit = Column(String(50)) # e.g., "GB", "inch"
    
#     category = relationship("Category")
#     spec_options = relationship("SpecOption", back_populates="specification")
#     variant_spec_values = relationship("VariantSpecValue", back_populates="specification")

# class SpecOption(Base):
#     __tablename__ = 'spec_options'
#     id = Column(Integer, primary_key=True) # option_id
#     spec_id = Column(Integer, ForeignKey('specifications.id'), nullable=False)
#     value = Column(String(255), nullable=False) # e.g., "Đen", "Bạc", "8GB"

#     specification = relationship("Specification", back_populates="spec_options")

# class VariantSpecValue(Base):
#     __tablename__ = 'variant_spec_values'
#     id = Column(Integer, primary_key=True)
#     variant_id = Column(Integer, ForeignKey('product_variants.id'), nullable=False)
#     spec_id = Column(Integer, ForeignKey('specifications.id'), nullable=False)
#     value_text = Column(String(255))
#     value_int = Column(Integer)
#     value_decimal = Column(Float)
#     option_id = Column(Integer, ForeignKey('spec_options.id')) # Đối với các thuộc tính có lựa chọn (e.g., Màu sắc)

#     variant = relationship("Variant", back_populates="variant_spec_values")
#     specification = relationship("Specification", back_populates="variant_spec_values")
#     spec_option = relationship("SpecOption") # Tên hàm quan hệ là spec_option (singular)




# print("--- Khởi tạo hệ thống và cấu hình hoàn tất ---")
# print(f"Cơ sở dữ liệu đang kết nối: {DB_HOST}/{DB_NAME}")


# In[ ]:


# Cell 2: Định nghĩa các hàm hỗ trợ (Metrics và Data Processing)

# === Helper functions for Recommendation Metrics ===
def precision_at_n(recommended_list: List[int], actual_interactions: set, n: int) -> float:
    if not recommended_list:
        return 0.0
    recommended_n = recommended_list[:n]
    hits = len(set(recommended_n).intersection(actual_interactions))
    return hits / len(recommended_n)

def recall_at_n(recommended_list: List[int], actual_interactions: set, n: int) -> float:
    if not actual_interactions:
        return 0.0
    recommended_n = recommended_list[:n]
    hits = len(set(recommended_n).intersection(actual_interactions))
    return hits / len(actual_interactions)


def ndcg_at_n(recommended_list: List[int], actual_interactions: set, n: int) -> float:
    if not actual_interactions or not recommended_list:
        return 0.0

    dcg = 0.0
    for i, item in enumerate(recommended_list[:n]):
        if item in actual_interactions:
            dcg += 1.0 / np.log2(i + 2)

   
    idcg = 0.0
    for i in range(min(n, len(actual_interactions))): # Chỉ lấy số lượng items có thật trong actual_interactions
        idcg += 1.0 / np.log2(i + 2)

    return dcg / idcg if idcg > 0 else 0.0
    
def average_precision(recommended_list: List[int], actual_interactions: set) -> float:
    if not actual_interactions or not recommended_list:
        return 0.0

    score = 0.0
    num_hits = 0.0
    for i, item in enumerate(recommended_list):
        if item in actual_interactions:
            num_hits += 1.0
            score += num_hits / (i + 1.0)
    return score / len(actual_interactions)


# === NEW CORE FUNCTIONS FOR IMPLICIT FEEDBACK & OPTIMIZATION ===

def load_all_user_events() -> pd.DataFrame:
    sql = text("""
    SELECT user_id, product_id, event_type, created_at
    FROM user_events
    """)
    with engine.begin() as conn:
        df = pd.read_sql(sql, conn)
    
    df['created_at'] = pd.to_datetime(df['created_at'])
    logger.info(f"Loaded {len(df)} user events from database.")
    return df


def assign_implicit_feedback_scores(df: pd.DataFrame, weights: Dict[str, float],
                                    frequency_decay_factor: float = 0.1,
                                    max_frequency_cap: int = 5) -> pd.DataFrame:
    df_copy = df.copy()

    # Tính tần suất của mỗi cặp (user, product, event_type)
    df_counts = df_copy.groupby(['user_id', 'product_id', 'event_type']).size().reset_index(name='interaction_count')

    # Ánh xạ trọng số cơ bản và chuẩn hóa
    max_weight = max(weights.values()) if weights else 1.0
    scaled_weights = {action: weight / max_weight for action, weight in weights.items()}

    df_counts['base_score'] = df_counts['event_type'].map(scaled_weights).fillna(0)

    # Tính toán điểm bổ sung dựa trên tần suất (có giới hạn)
    df_counts['capped_interaction_count'] = df_counts['interaction_count'].clip(upper=max_frequency_cap)

    # Công thức tính điểm cuối cùng
    df_counts['frequency_score_addition'] = df_counts['base_score'] * (df_counts['capped_interaction_count'] - 1) * frequency_decay_factor
    df_counts['final_implicit_score'] = df_counts['base_score'] + df_counts['frequency_score_addition']

    # Giới hạn điểm số
    df_counts['final_implicit_score'] = df_counts['final_implicit_score'].clip(lower=0, upper=1.0)

    # Gộp điểm số trở lại DataFrame gốc
    df_copy = df_copy.merge(
        df_counts[['user_id', 'product_id', 'event_type', 'final_implicit_score']],
        on=['user_id', 'product_id', 'event_type'],
        how='left'
    )
    df_copy['implicit_score'] = df_copy['final_implicit_score']
    df_copy.drop(columns=['final_implicit_score'], inplace=True)

    logger.info(f"Assigned implicit scores considering frequency. Min score: {df_copy['implicit_score'].min()}, Max score: {df_copy['implicit_score'].max()}")
    return df_copy
    

def split_data_time_based(df: pd.DataFrame, train_ratio: float = 0.6, val_ratio: float = 0.2, test_ratio: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if not np.isclose(train_ratio + val_ratio + test_ratio, 1.0):
        raise ValueError("train_ratio + val_ratio + test_ratio must sum to 1.0")

    df = df.sort_values(by=['user_id', 'created_at']).reset_index(drop=True) # Sắp xếp theo user_id trước, sau đó created_at

    df_train_indices = []
    df_val_indices = []
    df_test_indices = []

    for user_id, group_indices in df.groupby('user_id').groups.items():
        group = df.loc[group_indices].sort_values(by='created_at') # Đảm bảo trong mỗi nhóm vẫn được sắp xếp theo thời gian
        total_interactions = len(group)

        train_split_point = int(total_interactions * train_ratio)
        val_split_point = int(total_interactions * (train_ratio + val_ratio))

        # Lưu trữ index của các hàng
        df_train_indices.extend(group.iloc[:train_split_point].index.tolist())
        df_val_indices.extend(group.iloc[train_split_point:val_split_point].index.tolist())
        df_test_indices.extend(group.iloc[val_split_point:].index.tolist())

    df_train = df.loc[df_train_indices].reset_index(drop=True)
    df_val = df.loc[df_val_indices].reset_index(drop=True)
    df_test = df.loc[df_test_indices].reset_index(drop=True)

    logger.info(f"Data split: Train {len(df_train)} events, Validation {len(df_val)} events, Test {len(df_test)} events.")
    return df_train, df_val, df_test

# === NEW FUNCTIONS FOR CONTENT-BASED FILTERING (Updated for EAV) ===
def load_product_features() -> pd.DataFrame:
    """
    Tải dữ liệu thuộc tính sản phẩm từ cơ sở dữ liệu, bao gồm các đặc điểm EAV.
    Sẽ gộp tất cả các thông tin thuộc tính vào một chuỗi cho mỗi sản phẩm.
    """
    logger.info("Loading product features with EAV model from database...")
    session = SessionLocal()
    try:
        # Truy vấn chính để lấy thông tin Product, Category, Brand
        query_products = text("""
            SELECT
                p.id AS product_id,
                p.name AS product_name,
                p.description AS product_description,
                c.name AS category_name,
                b.name AS brand_name
            FROM
                products AS p
            LEFT JOIN
                categories AS c ON p.cat_id = c.id
            LEFT JOIN
                brands AS b ON p.brand_id = b.id
        """)
        df_products = pd.read_sql(query_products, session.bind)
        logger.info(f"Loaded base product data for {len(df_products)} products.")

        # Truy vấn để lấy tất cả các đặc điểm (specifications) thông qua variants
        # Cần JOIN qua variants, variant_spec_values, specifications, và spec_options
        query_specs = text("""
            SELECT
                p.id AS product_id,
                s.name AS spec_name,
                so.value AS spec_option_value,
                vsv.value_text,
                vsv.value_int,
                vsv.value_decimal,
                s.unit
            FROM
                products AS p
            JOIN
                product_variants AS pv ON p.id = pv.product_id
            JOIN
                variant_spec_values AS vsv ON pv.id = vsv.variant_id
            JOIN
                specifications AS s ON vsv.spec_id = s.id
            LEFT JOIN
                spec_options AS so ON vsv.option_id = so.id
            WHERE
                s.name IS NOT NULL
        """)
        df_specs = pd.read_sql(query_specs, session.bind)
        logger.info(f"Loaded {len(df_specs)} variant specific values.")

        # Gộp các đặc điểm (specifications) của cùng một sản phẩm lại thành một chuỗi
        # Mỗi sản phẩm có thể có nhiều variants, và mỗi variant có nhiều spec values.
        # Chúng ta cần gộp tất cả các spec values của TẤT CẢ variants thuộc MỘT sản phẩm.
        
        # Tạo cột 'spec_value_string' cho mỗi hàng trong df_specs
        df_specs['spec_value_string'] = df_specs.apply(lambda row: 
            f"{row['spec_name']}:{row['spec_option_value']}" if pd.notna(row['spec_option_value']) else
            f"{row['spec_name']}:{row['value_text']}" if pd.notna(row['value_text']) else
            f"{row['spec_name']}:{row['value_int']}{row['unit'] if pd.notna(row['unit']) else ''}" if pd.notna(row['value_int']) else
            f"{row['spec_name']}:{row['value_decimal']}{row['unit'] if pd.notna(row['unit']) else ''}" if pd.notna(row['value_decimal']) else
            '', axis=1
        )
        
        # Gộp tất cả các chuỗi đặc điểm cho mỗi product_id
        # Loại bỏ các giá trị trùng lặp của spec_value_string cho mỗi product_id
        df_product_specs = df_specs.groupby('product_id')['spec_value_string'].apply(lambda x: ' '.join(x.unique())).reset_index(name='all_specs_combined')
        
        # Kết hợp dữ liệu sản phẩm cơ bản và các đặc điểm EAV
        df_final_products = pd.merge(df_products, df_product_specs, on='product_id', how='left')
        
        # Kết hợp tất cả các thuộc tính vào một cột duy nhất cho TF-IDF
        df_final_products['combined_features'] = df_final_products['product_name'].fillna('') + ' ' + \
                                                  df_final_products['product_description'].fillna('') + ' ' + \
                                                  df_final_products['category_name'].fillna('') + ' ' + \
                                                  df_final_products['brand_name'].fillna('') + ' ' + \
                                                  df_final_products['all_specs_combined'].fillna('')
        
        # Loại bỏ các cột trung gian
        df_final_products = df_final_products[['product_id', 'combined_features']]
        df_final_products.rename(columns={'product_id': 'product_id'}, inplace=True) # Đảm bảo tên cột là 'product_id'
        
        logger.info(f"Final product features DataFrame created with {len(df_final_products)} products.")
        return df_final_products

    except Exception as e:
        logger.error(f"Error loading product features from EAV model: {e}")
        return pd.DataFrame(columns=['product_id', 'combined_features'])
    finally:
        session.close()


def compute_content_similarity(df_products: pd.DataFrame, top_k: int = TOP_K) -> Dict[int, List[Tuple[int, float]]]:
    """
    Tính toán độ tương đồng giữa các sản phẩm dựa trên nội dung (từ cột 'combined_features').
    """
    logger.info("Computing content-based similarity from combined_features...")

    if df_products.empty or 'combined_features' not in df_products.columns:
        logger.warning("No product data or 'combined_features' found for content similarity.")
        return {}

    # Xử lý các giá trị thiếu (nếu có)
    df_products['combined_features'] = df_products['combined_features'].fillna('')

    # Kiểm tra nếu tất cả các 'combined_features' đều rỗng
    if df_products['combined_features'].str.strip().eq('').all():
        logger.warning("All 'combined_features' are empty after fillna. Cannot compute meaningful TF-IDF.")
        return {}

    # Khởi tạo TF-IDF Vectorizer
    tfidf_vectorizer = TfidfVectorizer(stop_words='english', min_df=1, max_df=0.9) # Có thể điều chỉnh min_df, max_df
    
    # Fit và transform
    try:
        tfidf_matrix = tfidf_vectorizer.fit_transform(df_products['combined_features'])
        logger.info(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
    except ValueError as e:
        logger.error(f"Error during TF-IDF transformation: {e}. This might happen if all documents are empty or contain only stop words.")
        return {}

    # Tính toán độ tương đồng cosine giữa các item dựa trên TF-IDF
    content_sim_matrix = cosine_similarity(tfidf_matrix, dense_output=False)

    logger.info(f"Content similarity matrix shape: {content_sim_matrix.shape}")

    content_similarities: Dict[int, List[Tuple[int, float]]] = {}
    # Sử dụng index của DataFrame để ánh xạ lại product_id gốc
    product_id_map = {idx: pid for idx, pid in enumerate(df_products['product_id'])}

    for i, product_id_i in product_id_map.items():
        row = content_sim_matrix.getrow(i)
        if row.nnz:
            idxs = row.indices
            vals = row.data
            filtered = [
                (j_idx, s) for j_idx, s in zip(idxs, vals)
                if j_idx != i and s > 0 # Lọc bỏ chính nó và độ tương đồng bằng 0
            ]
            if filtered:
                topk_pairs = sorted(filtered, key=lambda x: x[1], reverse=True)[:top_k]
                content_similarities[product_id_i] = [(product_id_map[j_idx], float(s)) for j_idx, s in topk_pairs]
            else:
                content_similarities[product_id_i] = []
        else:
            content_similarities[product_id_i] = []

    logger.info(f"Finished computing content-based similarity for {len(content_similarities)} products.")
    return content_similarities

# Hàm combine_similarities - SỬA ĐỔI QUAN TRỌNG
def combine_similarities(
    collab_sims: Dict[int, List[Tuple[int, float]]],
    content_sims: Dict[int, List[Tuple[int, float]]],
    alpha: float,
    top_k: int = TOP_K
) -> Dict[int, List[Tuple[int, float, float, float]]]: # THAY ĐỔI KIỂU TRẢ VỀ Ở ĐÂY
    """
    Kết hợp độ tương đồng Item-based Collaborative và Content-based.
    Trả về điểm số lai, cùng với điểm số gốc CF và Content-based cho mỗi cặp.
    collab_sims: Dict[int, List[Tuple[int, float]]] - Độ tương đồng từ Collaborative Filtering.
    content_sims: Dict[int, List[Tuple[int, float]]] - Độ tương đồng từ Content-based.
    alpha: float - Trọng số cho Collaborative Filtering (0 <= alpha <= 1).
                    Content-based sẽ có trọng số (1 - alpha).
    """
    logger.info(f"Combining similarities with alpha={alpha}. CF weight: {alpha}, Content weight: {1-alpha}")
    
    # Sử dụng defaultdict để lưu trữ điểm số lai, CF và Content cho mỗi cặp (p1, p2)
    # Giá trị là một tuple (hybrid_score, cf_score, content_score)
    hybrid_similarities_detail: Dict[int, Dict[int, Tuple[float, float, float]]] = defaultdict(lambda: defaultdict(lambda: (0.0, 0.0, 0.0)))

    all_product_ids = set(collab_sims.keys()).union(set(content_sims.keys()))

    for p1 in all_product_ids:
        # Chuyển list of tuples sang dict để dễ dàng tra cứu
        collab_neighbors_map = {p2: score for p2, score in collab_sims.get(p1, [])}
        content_neighbors_map = {p2: score for p2, score in content_sims.get(p1, [])}

        # Lấy tất cả các láng giềng tiềm năng từ cả hai nguồn
        all_neighbors_for_p1 = set(collab_neighbors_map.keys()).union(set(content_neighbors_map.keys()))

        for p2 in all_neighbors_for_p1:
            cf_score = collab_neighbors_map.get(p2, 0.0)
            content_score = content_neighbors_map.get(p2, 0.0)

            # Tính điểm lai
            hybrid_score = (alpha * cf_score) + ((1 - alpha) * content_score)
            
            # Lưu trữ cả 3 điểm số
            # Đảm bảo điểm số không âm, có thể làm tròn nếu cần
            hybrid_similarities_detail[p1][p2] = (
                max(0.0, float(hybrid_score)),
                max(0.0, float(cf_score)),
                max(0.0, float(content_score))
            )
            
        # Loại bỏ chính nó (nếu tồn tại)
        if p1 in hybrid_similarities_detail[p1]:
            del hybrid_similarities_detail[p1][p1]

    final_hybrid_sims: Dict[int, List[Tuple[int, float, float, float]]] = {}
    for p1, p2_scores_detail in hybrid_similarities_detail.items():
        # Sắp xếp theo điểm lai (phần tử đầu tiên trong tuple)
        sorted_neighbors = sorted(p2_scores_detail.items(), key=lambda x: x[1][0], reverse=True)[:top_k]
        
        # Định dạng lại đầu ra thành list of tuples (p2, hybrid_score, cf_score, content_score)
        final_hybrid_sims[p1] = [(p2, hs, cfs, cons) for p2, (hs, cfs, cons) in sorted_neighbors]

    logger.info(f"Finished combining similarities for {len(final_hybrid_sims)} products, now including detailed scores.")
    return final_hybrid_sims


# Không in kết quả trực tiếp ở đây vì đây là các định nghĩa hàm.
print("--- Định nghĩa các hàm hỗ trợ và xử lý dữ liệu hoàn tất ---")


# In[ ]:


# Cell 3: Tải dữ liệu và Chia tập Train/Validation/Test

# 1. Tải tất cả các sự kiện người dùng
print("--- Bắt đầu tải dữ liệu người dùng từ cơ sở dữ liệu ---")
df_raw_events = load_all_user_events()

if df_raw_events.empty:
    logger.warning("Không tìm thấy sự kiện người dùng nào. Dừng quá trình.")
    # Để đảm bảo các cell sau không bị lỗi, có thể thoát hoặc xử lý đặc biệt
    # raise SystemExit("Không có dữ liệu để xử lý.")
else:
    print("\n--- 5 hàng đầu tiên của dữ liệu sự kiện thô ---")
    print(df_raw_events.head())
    print(f"\nTổng số sự kiện đã tải: {len(df_raw_events)}")
    print(f"Số lượng người dùng duy nhất: {df_raw_events['user_id'].nunique()}")
    print(f"Số lượng sản phẩm duy nhất: {df_raw_events['product_id'].nunique()}")
    print(f"Các loại sự kiện và số lượng: \n{df_raw_events['event_type'].value_counts()}")


# 2. Chia dữ liệu thành tập Train, Validation và Test dựa trên thời gian
print("\n--- Bắt đầu chia tập dữ liệu thành Train, Validation, Test ---")
df_train_raw, df_val_raw, df_test_raw = split_data_time_based(df_raw_events.copy(), train_ratio=0.6, val_ratio=0.2, test_ratio=0.2)

print("\n--- Thống kê sau khi chia tập dữ liệu ---")
print(f"Kích thước tập Train: {len(df_train_raw)} sự kiện")
print(f"Kích thước tập Validation: {len(df_val_raw)} sự kiện")
print(f"Kích thước tập Test: {len(df_test_raw)} sự kiện")

print("\n--- 5 hàng đầu tiên của tập Train ---")
print(df_train_raw.head())
print("\n--- 5 hàng đầu tiên của tập Validation ---")
print(df_val_raw.head())
print("\n--- 5 hàng đầu tiên của tập Test ---")
print(df_test_raw.head())

# --- THÊM CÁC KIỂM TRA MỚI VÀO ĐÂY ---
print("\n--- KIỂM TRA SAU KHI CHIA TẬP ---")

# 1. Số lượng người dùng duy nhất trong mỗi tập
print(f"Người dùng duy nhất trong Train: {df_train_raw['user_id'].nunique()}")
print(f"Người dùng duy nhất trong Validation: {df_val_raw['user_id'].nunique()}")
print(f"Người dùng duy nhất trong Test: {df_test_raw['user_id'].nunique()}")

# 2. Số lượng sự kiện 'purchase' trong tập Train
train_purchases_count = df_train_raw[df_train_raw['event_type'] == 'purchase'].shape[0]
print(f"Tổng số sự kiện 'purchase' trong tập Train: {train_purchases_count}")

# 3. Số lượng người dùng có sự kiện 'purchase' trong tập Train
users_with_train_purchases = df_train_raw[df_train_raw['event_type'] == 'purchase']['user_id'].unique()
print(f"Số lượng người dùng có ít nhất 1 sự kiện 'purchase' trong Train: {len(users_with_train_purchases)}")

# 4. Số lượng người dùng có bất kỳ tương tác nào trong tập Validation
users_with_val_interactions = df_val_raw['user_id'].unique()
print(f"Số lượng người dùng có bất kỳ tương tác nào trong Validation: {len(users_with_val_interactions)}")

# 5. Sự giao thoa giữa người dùng có 'purchase' trong Train và người dùng có tương tác trong Validation
common_users_for_eval = set(users_with_train_purchases) & set(users_with_val_interactions)
print(f"Số lượng người dùng đủ điều kiện để đánh giá (mua trong Train & tương tác trong Val): {len(common_users_for_eval)}")

if len(common_users_for_eval) == 0:
    print("!!! CẢNH BÁO: Không có người dùng nào đủ điều kiện để đánh giá mô hình. Điều này sẽ dẫn đến metrics bằng 0.")
    print("Vấn đề có thể do cách chia dữ liệu theo thời gian hoặc dữ liệu quá thưa thớt.")
    # In ra một số ví dụ để kiểm tra thủ công (nếu muốn)
    # print("Một số user_id có purchase trong train:", list(users_with_train_purchases)[:5])
    # print("Một số user_id có tương tác trong validation:", list(users_with_val_interactions)[:5])

print("--- KẾT THÚC KIỂM TRA SAU KHI CHIA TẬP ---\n")
# --- KẾT THÚC CÁC KIỂM TRA MỚI ---


# Trực quan hóa phân bố sự kiện theo thời gian (nếu có đủ dữ liệu)
plt.figure(figsize=(12, 6))
df_raw_events['created_at'].hist(bins=50)
plt.title('Phân bố số lượng sự kiện theo thời gian')
plt.xlabel('Thời gian')
plt.ylabel('Số lượng sự kiện')
plt.grid(True)
plt.show()

# Trực quan hóa phân bố loại sự kiện
plt.figure(figsize=(8, 5))
sns.countplot(y='event_type', data=df_raw_events, order=df_raw_events['event_type'].value_counts().index)
plt.title('Phân bố các loại sự kiện')
plt.xlabel('Số lượng sự kiện')
plt.ylabel('Loại sự kiện')
plt.show()


# In[ ]:


# Cell 4: Tối ưu hóa trọng số Implicit Feedback (Sử dụng Bayesian Optimization) và Tính toán/Lưu trữ Hybrid Item Similarity

from skopt import gp_minimize
from skopt.space import Real
from skopt.utils import use_named_args
from skopt.plots import plot_convergence, plot_evaluations, plot_objective
import matplotlib.pyplot as plt
import json
import datetime
import os

print("\n--- Bắt đầu quá trình tối ưu hóa trọng số Implicit Feedback cho Hệ thống Lai bằng Bayesian Optimization ---")

# --- CHUẨN BỊ DỮ LIỆU CONTENT-BASED (CHỈ TẢI MỘT LẦN) ---
print("\n--- Đang tải và xử lý dữ liệu thuộc tính sản phẩm cho Content-based Filtering ---")
df_product_features = load_product_features()

# Kiểm tra nếu df_product_features rỗng, log cảnh báo và có thể thoát
if df_product_features.empty:
    logger.error("Không thể tải dữ liệu thuộc tính sản phẩm. Content-based Filtering sẽ không hoạt động.")
    content_similarities_global = {} # Đặt rỗng để tránh lỗi
else:
    content_similarities_global = compute_content_similarity(df_product_features, top_k=TOP_K)
    logger.info(f"Hoàn tất tính toán độ tương đồng Content-based cho {len(content_similarities_global)} sản phẩm.")
    if not content_similarities_global:
        logger.warning("Không có độ tương đồng Content-based được tính toán. Kiểm tra dữ liệu và TF-IDF.")


def evaluate_weights_for_similarity(
    df_train_raw: pd.DataFrame,
    df_eval_raw: pd.DataFrame,
    current_weights: Dict[str, float],
    hybrid_alpha: float,
    content_sims: Dict[int, List[Tuple[int, float]]],
    top_n_recommendations: int = TOP_N_RECOMMENDATIONS
) -> Dict[str, float]:
    """
    Đánh giá chất lượng gợi ý (NDCG, Precision, Recall, MAP)
    cho một tập hợp trọng số phản hồi ngầm và trọng số lai (alpha) đã cho,
    sử dụng cả Collaborative Filtering và Content-based Filtering.
    """
    logger.debug(f"Đánh giá với trọng số: {current_weights}, alpha lai: {hybrid_alpha}")
    
    # --- 1. Tính toán điểm phản hồi ngầm và độ tương đồng Collaborative Filtering ---
    df_train_weighted = assign_implicit_feedback_scores(df_train_raw.copy(), current_weights)

    df_positive_scores = df_train_weighted[df_train_weighted['implicit_score'] > 0]
    logger.info(f"DEBUG_EVAL: Số lượng dòng có implicit_score > 0 trong df_train_weighted: {len(df_positive_scores)}")
    logger.info(f"DEBUG_EVAL: Số lượng người dùng duy nhất có implicit_score > 0 trong df_train_weighted: {df_positive_scores['user_id'].nunique()}")
    logger.info(f"DEBUG_EVAL: Số lượng sản phẩm duy nhất có implicit_score > 0 trong df_positive_scores: {df_positive_scores['product_id'].nunique()}")

    if df_train_weighted.empty or df_train_weighted['implicit_score'].sum() == 0:
        logger.warning("Không có dữ liệu huấn luyện có trọng số ý nghĩa cho CF. Trả về các số liệu bằng không.")
        return {'precision_at_n': 0.0, 'recall_at_n': 0.0, 'ndcg_at_n': 0.0, 'map': 0.0}
    logger.info(f"DF_TRAIN_WEIGHTED cho CF: {len(df_train_weighted)} dòng, min_score={df_train_weighted['implicit_score'].min():.2f}, max_score={df_train_weighted['implicit_score'].max():.2f}")

    collab_similarities = compute_sparse_similarity(
        df_train_weighted, top_k=TOP_K, threshold=COSINE_THRESHOLD
    )
    logger.info(f"Số lượng item có độ tương đồng CF: {len(collab_similarities)}")

    # --- 2. Kết hợp độ tương đồng CF và Content-based ---
    if not collab_similarities and not content_sims:
        logger.warning("Không có độ tương đồng CF hoặc Content-based. Không thể tạo gợi ý lai. Trả về các số liệu bằng không.")
        return {'precision_at_n': 0.0, 'recall_at_n': 0.0, 'ndcg_at_n': 0.0, 'map': 0.0}

    hybrid_similarities = combine_similarities(
        collab_similarities, content_sims, hybrid_alpha, top_k=TOP_K
    )
    logger.info(f"Số lượng item có độ tương đồng lai: {len(hybrid_similarities)}")

    if not hybrid_similarities:
        logger.warning("Ma trận độ tương đồng lai rỗng. Trả về các số liệu bằng không.")
        return {'precision_at_n': 0.0, 'recall_at_n': 0.0, 'ndcg_at_n': 0.0, 'map': 0.0}

    # --- 3. Đánh giá hệ thống gợi ý lai ---
    user_train_purchases_map = df_train_raw[df_train_raw['event_type'] == 'purchase'] \
                                .groupby('user_id')['product_id'].apply(set).to_dict()

    user_eval_actual_interactions = df_eval_raw.groupby('user_id')['product_id'].apply(set).to_dict()
    
    users_to_evaluate = [u for u in user_eval_actual_interactions.keys() if u in user_train_purchases_map]
    
    precisions, recalls, ndcgs, maps = [], [], [], []
    logger.info(f"Số lượng người dùng đủ điều kiện để đánh giá: {len(users_to_evaluate)}")

    for user_id in users_to_evaluate:
        train_purchased_items = user_train_purchases_map.get(user_id, set())
        actual_items = user_eval_actual_interactions.get(user_id, set())

        if not train_purchased_items or not actual_items:
            continue
            
        scores: Dict[int, float] = defaultdict(float)
        
        # Aggregate scores from hybrid similar items
        for p in train_purchased_items:
            for q, hybrid_score, _, _ in hybrid_similarities.get(p, []):
                if q not in train_purchased_items:
                    scores[q] += float(hybrid_score)

        recommended_items_list = [item for item, score in sorted(scores.items(), key=lambda x: x[1], reverse=True)][:top_n_recommendations]
        
        if recommended_items_list and actual_items:
            precisions.append(precision_at_n(recommended_items_list, actual_items, top_n_recommendations))
            recalls.append(recall_at_n(recommended_items_list, actual_items, top_n_recommendations))
            ndcgs.append(ndcg_at_n(recommended_items_list, actual_items, top_n_recommendations))
            maps.append(average_precision(recommended_items_list, actual_items))

    avg_precision = np.mean(precisions) if precisions else 0.0
    avg_recall = np.mean(recalls) if recalls else 0.0
    avg_ndcg = np.mean(ndcgs) if ndcgs else 0.0
    avg_map = np.mean(maps) if maps else 0.0
    
    logger.debug(f"Kết quả đánh giá: P@{top_n_recommendations}: {avg_precision:.4f}, R@{top_n_recommendations}: {avg_recall:.4f}, NDCG@{top_n_recommendations}: {avg_ndcg:.4f}, MAP: {avg_map:.4f}")

    return {
        'precision_at_n': avg_precision,
        'recall_at_n': avg_recall,
        'ndcg_at_n': avg_ndcg,
        'map': avg_map
    }


def compute_sparse_similarity(
    df: pd.DataFrame,
    top_k: int = TOP_K,
    threshold: float = COSINE_THRESHOLD
) -> Dict[int, List[Tuple[int, float]]]:
    """
    Tính toán độ tương đồng item-item cosine từ DataFrame với điểm phản hồi ngầm,
    trả về một từ điển chứa top-k item tương đồng cho mỗi item.
    """
    logger.info("Đang tính toán ma trận độ tương đồng item-item thưa thớt sử dụng điểm ngầm...")
        
    if 'implicit_score' not in df.columns:
        raise ValueError("DataFrame phải chứa cột 'implicit_score'.")
        
    df_filtered = df[df['implicit_score'] > 0].copy()

    logger.info(f"DEBUG_SIM: Kích thước DataFrame đã lọc (implicit_score > 0): {len(df_filtered)} dòng")
    if df_filtered.empty:
        logger.warning("Không tìm thấy điểm ngầm dương nào để tính độ tương đồng. Trả về từ điển rỗng.")
        return {}

    active_users = df_filtered['user_id'].unique()
    active_items = df_filtered['product_id'].unique()
    logger.info(f"DEBUG_SIM: Số lượng người dùng hoạt động duy nhất sau khi lọc: {len(active_users)}")
    logger.info(f"DEBUG_SIM: Số lượng item hoạt động duy nhất sau khi lọc: {len(active_items)}")

    user_to_idx = {u: i for i, u in enumerate(active_users)}
    item_to_idx = {p: i for i, p in enumerate(active_items)}
    idx_to_item = {i: p for p, i in item_to_idx.items()}

    rows = df_filtered['user_id'].map(user_to_idx)
    cols = df_filtered['product_id'].map(item_to_idx)
    data = df_filtered['implicit_score'].astype(float).to_numpy()
    
    logger.info(f"DEBUG_SIM: Kích thước của rows: {len(rows)}, cols: {len(cols)}, data: {len(data)}")
    
    if len(active_users) == 0 or len(active_items) == 0:
        logger.warning("Không đủ người dùng hoặc item duy nhất có điểm ngầm dương để tính toán độ tương đồng. Trả về từ điển rỗng.")
        return {}

    sparse_ui = csr_matrix((data, (rows, cols)), shape=(len(active_users), len(active_items)))
    logger.info(f"DEBUG_SIM: Hình dạng ma trận User-Item thưa thớt: {sparse_ui.shape}, số lượng phần tử khác không (nnz): {sparse_ui.nnz}")

    sim_matrix = cosine_similarity(sparse_ui.T, dense_output=False)
    logger.info(f"DEBUG_SIM: Hình dạng ma trận độ tương đồng Item-Item thưa thớt: {sim_matrix.shape}, số lượng phần tử khác không (nnz): {sim_matrix.nnz}")

    item_similarities: Dict[int, List[Tuple[int, float]]] = {}
    count_items_with_any_similarity_after_threshold = 0

    for i, item_idx_i in enumerate(active_items):
        original_product_id = item_idx_i
        row = sim_matrix.getrow(i)

        if row.nnz:
            idxs = row.indices
            vals = row.data
            
            filtered_similarities = [
                (j_idx, s) for j_idx, s in zip(idxs, vals)
                if j_idx != i and s >= threshold
            ]
            
            if filtered_similarities:
                count_items_with_any_similarity_after_threshold += 1
                topk_pairs = sorted(filtered_similarities, key=lambda x: x[1], reverse=True)[:top_k]
                item_similarities[original_product_id] = [(idx_to_item[j_idx], float(s)) for j_idx, s in topk_pairs]
            else:
                item_similarities[original_product_id] = []
        else:
            item_similarities[original_product_id] = []

    logger.info(f"DEBUG_SIM: Tổng số item (original_product_id) có ít nhất MỘT độ tương đồng HỢP LỆ (khác nó và >= ngưỡng): {count_items_with_any_similarity_after_threshold}")
    logger.info("Hoàn tất tính toán độ tương đồng thưa thớt.")
    return item_similarities


# Định nghĩa không gian tìm kiếm cho Bayesian Optimization
# Bây giờ bao gồm cả HYBRID_ALPHA
space = [
    Real(0.01, 0.2, name='view_product'),
    Real(0.2, 0.7, name='add_to_cart'),
    Real(0.1, 0.4, name='wishlist'),
    Real(0.0, 1.0, name='hybrid_alpha')
]

# Định nghĩa trọng số purchase cố định
FIXED_PURCHASE_WEIGHT = 1.0

# Hàm mục tiêu để tối thiểu hóa (Bayesian Optimization tìm giá trị nhỏ nhất)
# Vì chúng ta muốn tối đa hóa NDCG, chúng ta sẽ trả về -NDCG
@use_named_args(space)
def objective(view_product, add_to_cart, wishlist, hybrid_alpha):
    current_weights = {
        'view_product': view_product,
        'add_to_cart': add_to_cart,
        'wishlist': wishlist,
        'purchase': FIXED_PURCHASE_WEIGHT
    }
    
    # Kiểm tra ràng buộc thứ tự cho trọng số phản hồi ngầm
    epsilon = 1e-6
    if not (current_weights['view_product'] < current_weights['wishlist'] - epsilon and
            current_weights['wishlist'] < current_weights['add_to_cart'] - epsilon and
            current_weights['add_to_cart'] < current_weights['purchase'] - epsilon):
        logger.warning(f"DEBUG_OBJ: Vi phạm ràng buộc thứ tự với trọng số ngầm: {current_weights}. Trả về 1.0.")
        return 1.0 # Giá trị cao, nghĩa là tệ, để Bayesian Opt không chọn

    # Kiểm tra ràng buộc cho hybrid_alpha
    if not (0.0 <= hybrid_alpha <= 1.0):
        logger.warning(f"DEBUG_OBJ: hybrid_alpha ({hybrid_alpha}) nằm ngoài khoảng [0, 1]. Trả về 1.0.")
        return 1.0

    logger.info(f"DEBUG_OBJ: Đánh giá với trọng số: {current_weights}, alpha lai: {hybrid_alpha}")

    evaluation_metrics = evaluate_weights_for_similarity(
        df_train_raw.copy(),
        df_val_raw.copy(),
        current_weights,
        hybrid_alpha,
        content_similarities_global,
        TOP_N_RECOMMENDATIONS
    )
    
    score_to_minimize = -evaluation_metrics['ndcg_at_n']
    logger.info(f"DEBUG_OBJ: NDCG@{TOP_N_RECOMMENDATIONS}: {evaluation_metrics['ndcg_at_n']:.4f}, Optimization Score: {score_to_minimize:.4f}")
    return score_to_minimize

# --- Khởi tạo biến toàn cục với giá trị mặc định ---
# Đảm bảo các biến này luôn có giá trị, ngay cả khi tối ưu hóa không chạy
best_weights_found = {
    'view_product': 0.01, # Giá trị mặc định thấp nhất từ space
    'add_to_cart': 0.2,
    'wishlist': 0.1,
    'purchase': FIXED_PURCHASE_WEIGHT
}
best_hybrid_alpha = HYBRID_ALPHA # Sử dụng giá trị HYBRID_ALPHA từ cấu hình ban đầu
best_ndcg = 0.0 # Giá trị mặc định cho NDCG

# Thực hiện tối ưu hóa Bayesian nếu dữ liệu đủ
if not df_raw_events.empty and 'common_users_for_eval' in locals() and len(common_users_for_eval) > 0:
    logger.info("Bắt đầu tối ưu hóa Bayesian...")
    result = gp_minimize(
        objective,
        space,
        n_calls=50,
        n_random_starts=10,
        random_state=42,
        verbose=True
    )

    # Cập nhật các biến toàn cục với kết quả tối ưu hóa
    best_weights_found = {
        'view_product': result.x[0],
        'add_to_cart': result.x[1],
        'wishlist': result.x[2],
        'purchase': FIXED_PURCHASE_WEIGHT
    }
    best_hybrid_alpha = result.x[3]
    best_ndcg = -result.fun

    print(f"\n--- Trọng số tối ưu tìm được bằng Bayesian Optimization trên tập Validation: {best_weights_found} ---")
    print(f"--- Alpha lai tối ưu: {best_hybrid_alpha:.4f} với điểm NDCG tốt nhất: {best_ndcg:.4f} ---")


    # --- THÊM PHẦN LƯU TRỮ TRỌNG SỐ VÀO TỆP JSON TẠI ĐÂY ---
    results_dir = 'optimization_results'
    os.makedirs(results_dir, exist_ok=True)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    weights_file_name = os.path.join(results_dir, f'optimal_hybrid_weights_{timestamp}.json')

    try:
        with open(weights_file_name, 'w') as f:
            json.dump({
                "optimal_implicit_weights": best_weights_found,
                "optimal_hybrid_alpha": best_hybrid_alpha,
                "best_ndcg": best_ndcg,
                "top_n_recommendations": TOP_N_RECOMMENDATIONS,
                "top_k_similar_items": TOP_K,
                "cosine_threshold": COSINE_THRESHOLD,
                "optimization_timestamp": timestamp
            }, f, indent=4)
        print(f"\n--- Trọng số lai tối ưu đã được lưu vào: {weights_file_name} ---")
    except Exception as e:
        print(f"\n--- Lỗi khi lưu trọng số vào tệp JSON: {e} ---")


    # --- THÊM PHẦN TRỰC QUAN HÓA SAU ĐÂY ---
    print("\n--- Trực quan hóa quá trình tối ưu hóa Bayesian ---")

    plt.figure(figsize=(10, 6))
    plot_convergence(result)
    plt.title("Biểu đồ hội tụ của Bayesian Optimization")
    plt.xlabel("Số lần lặp")
    plt.ylabel("Giá trị NDCG tốt nhất (đã đảo dấu)")
    plt.grid(True)
    plt.show()

    fig, ax = plt.subplots(figsize=(12, 8))
    plot_evaluations(result, ax=ax)
    plt.suptitle("Các điểm đã được đánh giá trong không gian tham số")
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.show()

    fig, ax = plt.subplots(figsize=(12, 10))
    plot_objective(result, ax=ax)
    plt.suptitle("Các hàm mục tiêu ước tính và các điểm đánh giá")
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.show()

    print("\n--- Kết thúc trực quan hóa ---")

else:
    logger.warning("Bỏ qua Tối ưu hóa Bayesian do không đủ dữ liệu để đánh giá (ví dụ: không có người dùng chung để đánh giá).")
    logger.info(f"Sử dụng trọng số mặc định: {best_weights_found}, alpha mặc định: {best_hybrid_alpha:.4f}")

print("\n--- Hoàn tất quá trình tối ưu hóa trọng số Implicit Feedback cho Hệ thống Lai ---")


# --- BẮT ĐẦU NỘI DUNG TỪ CELL 6 (ĐÃ NỐI VÀO CELL 4) ---
print("\n--- Bắt đầu quá trình tính toán và lưu trữ Hybrid Item Similarity ---")

# 1. Tải và xử lý dữ liệu thuộc tính sản phẩm cho Content-based Filtering
# (Bước này thực tế đã được chạy ở đầu Cell 4 và content_similarities_global đã có)
# Chúng ta sẽ không cần chạy lại nếu nó đã có.
if 'content_similarities_global' not in locals() or not content_similarities_global:
    print("\n--- Đang tải và xử lý dữ liệu thuộc tính sản phẩm cho Content-based Filtering (nếu chưa có) ---")
    df_product_features = load_product_features()
    if df_product_features.empty:
        logger.error("Không thể tải dữ liệu thuộc tính sản phẩm. Content-based Filtering sẽ không hoạt động.")
        content_similarities_global = {}
    else:
        content_similarities_global = compute_content_similarity(df_product_features, top_k=TOP_K)
        logger.info(f"Hoàn tất tính toán độ tương đồng Content-based cho {len(content_similarities_global)} sản phẩm.")
        if not content_similarities_global:
            logger.warning("Không có độ tương đồng Content-based được tính toán. Kiểm tra dữ liệu và TF-IDF.")


# 2. Áp dụng trọng số tối ưu cho toàn bộ dữ liệu sự kiện thô để có 'implicit_score'
print("\n--- Áp dụng trọng số tối ưu cho toàn bộ dữ liệu sự kiện ---")
# best_weights_found và best_hybrid_alpha giờ đã là biến toàn cục
df_weighted_events_for_final_model = assign_implicit_feedback_scores(df_raw_events.copy(), best_weights_found)
logger.info(f"Tổng số sự kiện sau khi gán trọng số: {len(df_weighted_events_for_final_model)}")
logger.info(f"Số lượng sự kiện có implicit_score > 0: {len(df_weighted_events_for_final_model[df_weighted_events_for_final_model['implicit_score'] > 0])}")

print("--- 5 hàng đầu tiên của dữ liệu sự kiện đã gán trọng số (Toàn bộ dữ liệu) ---")
print(df_weighted_events_for_final_model.head())

# Trực quan hóa phân bố điểm implicit_score
plt.figure(figsize=(10, 6))
sns.histplot(df_weighted_events_for_final_model['implicit_score'], bins=20, kde=True)
plt.title('Phân bố điểm Implicit Score (Toàn bộ dữ liệu)')
plt.xlabel('Implicit Score')
plt.ylabel('Số lượng sự kiện')
plt.grid(True)
plt.show()

# 3. Tính toán độ tương đồng Collaborative Filtering từ toàn bộ dữ liệu
print("\n--- Bắt đầu tính toán độ tương đồng Collaborative Filtering (CF) từ toàn bộ dữ liệu ---")
collab_similarities_final = compute_sparse_similarity(df_weighted_events_for_final_model, TOP_K, COSINE_THRESHOLD)
logger.info(f"Đã tính toán độ tương đồng CF cho {len(collab_similarities_final)} sản phẩm.")

# 4. Kết hợp độ tương đồng CF và Content-based sử dụng alpha lai tối ưu
print("\n--- Bắt đầu kết hợp độ tương đồng CF và Content-based (Hybrid) ---")
final_hybrid_similarities = combine_similarities(
    collab_similarities_final,
    content_similarities_global,
    best_hybrid_alpha, # Sử dụng alpha lai tối ưu
    top_k=TOP_K
)
logger.info(f"Đã tính toán độ tương đồng Hybrid cho {len(final_hybrid_similarities)} sản phẩm.")

# Kiểm tra nếu final_hybrid_similarities rỗng
if not final_hybrid_similarities:
    logger.warning("Ma trận độ tương đồng lai cuối cùng rỗng. Không có dữ liệu để lưu trữ.")
else:
    # Hiển thị một vài ví dụ về độ tương đồng lai
    print("\n--- 5 ví dụ đầu tiên về Hybrid Item Similarity (Product ID: [List of (Similar Product ID, Hybrid Score, CF Score, Content Score)]) ---")
    count = 0
    for pid, sim_list in final_hybrid_similarities.items():
        print(f"Product ID {pid}: {sim_list}")
        count += 1
        if count >= 5:
            break

    # Trực quan hóa phân bố điểm số tương đồng lai (nếu có dữ liệu)
    all_hybrid_scores = []
    for pid, sim_list in final_hybrid_similarities.items():
        for _, hybrid_score, cf_score, content_score in sim_list:
            all_hybrid_scores.append(hybrid_score)

    if all_hybrid_scores:
        plt.figure(figsize=(10, 6))
        sns.histplot(all_hybrid_scores, bins=50, kde=True)
        plt.title('Phân bố điểm số tương đồng lai (Hybrid Item Similarity)')
        plt.xlabel('Điểm số tương đồng')
        plt.ylabel('Số lượng cặp sản phẩm')
        plt.grid(True)
        plt.show()
    else:
        print("\nKhông có đủ dữ liệu độ tương đồng lai để vẽ biểu đồ.")


    # 5. Lưu trữ độ tương đồng lai vào cơ sở dữ liệu
    def save_item_similarities_to_db(similarities: Dict[int, List[Tuple[int, float, float, float]]]):
        logger.info("Bắt đầu lưu độ tương đồng item lai vào database...")
        session = SessionLocal()
        try:
            session.execute(text(f"TRUNCATE TABLE {ItemSimilarity.__tablename__}"))
            session.commit()
            logger.info(f"Cleared existing data from {ItemSimilarity.__tablename__}.")
            batch = []
            row_count = 0
            processed_pairs = set()

            for p1, neighbours in similarities.items():
                for p2, hybrid_score, cf_score, content_score in neighbours:
                    prod_id_1_normalized = min(int(p1), int(p2))
                    prod_id_2_normalized = max(int(p1), int(p2))

                    if prod_id_1_normalized == prod_id_2_normalized:
                        continue

                    current_pair = (prod_id_1_normalized, prod_id_2_normalized)

                    if current_pair not in processed_pairs:
                        batch.append({
                            'product_id_1': prod_id_1_normalized,
                            'product_id_2': prod_id_2_normalized,
                            'score': float(hybrid_score),
                            'cf_score': float(cf_score),
                            'content_score': float(content_score)
                        })
                        processed_pairs.add(current_pair)
                        row_count += 1

                    if len(batch) >= BATCH_SIZE:
                        try:
                            session.bulk_insert_mappings(ItemSimilarity, batch)
                            session.commit()
                            logger.debug(f"Inserted {len(batch)} rows into {ItemSimilarity.__tablename__}.")
                        except Exception as insert_e:
                            session.rollback()
                            logger.error(f"Lỗi khi bulk_insert_mappings: {insert_e}")
                            raise
                        finally:
                            batch.clear()

            if batch:
                try:
                    session.bulk_insert_mappings(ItemSimilarity, batch)
                    session.commit()
                except Exception as insert_e:
                    session.rollback()
                    logger.error(f"Lỗi khi bulk_insert_mappings phần còn lại: {insert_e}")
                    raise

            logger.info(f"Persisted {row_count} unique item similarities successfully into {ItemSimilarity.__tablename__}.")
        except Exception as e:
            session.rollback()
            logger.exception("Failed to persist item similarity: %s", e)
        finally:
            session.close()

    print("\n--- Bắt đầu lưu trữ độ tương đồng Hybrid Item Similarity vào cơ sở dữ liệu ---")
    save_item_similarities_to_db(final_hybrid_similarities)
    print("--- Hoàn tất lưu trữ Hybrid Item Similarity ---")

print("\n--- Hoàn tất quá trình tính toán và lưu trữ Hybrid Item Similarity ---")


# In[ ]:


# Cell 7: Tạo và lưu trữ Recommendations cho người dùng
import pandas as pd
from typing import Dict, List, Tuple
from collections import defaultdict
from sqlalchemy import create_engine, text
import logging



# 6. Tạo đề xuất cho người dùng dựa trên độ tương đồng LAI và các tương tác đã gán trọng số
def generate_hybrid_recommendations(df_weighted_events: pd.DataFrame, top_n: int = TOP_N_RECOMMENDATIONS) -> Dict[int, List[Tuple[int, float]]]:
    """
    Tạo đề xuất sản phẩm cho người dùng dựa trên độ tương đồng item-item đã được tính toán (lai).
    Sử dụng TẤT CẢ các sản phẩm mà người dùng đã tương tác (có implicit_score) làm "hạt giống"
    và chỉ bỏ qua gợi ý những sản phẩm đã MUA.
    """
    logger.info("Đang tạo đề xuất lai cho người dùng...")

    # Đảm bảo df_weighted_events không rỗng
    if df_weighted_events.empty:
        logger.warning("DataFrame sự kiện có trọng số rỗng. Không thể tạo đề xuất.")
        return {}

    # Đọc tất cả các cặp tương đồng LAI từ DB
    conn = engine.connect()
    try:
        # Giả định bảng item_similarity hiện tại chứa độ tương đồng lai từ Cell 6
        sim_rows = conn.execute(text("SELECT product_id_1, product_id_2, score FROM item_similarity")).fetchall()
        logger.info(f"Đã đọc {len(sim_rows)} cặp độ tương đồng lai từ cơ sở dữ liệu.")
    except Exception as e:
        logger.error(f"Lỗi khi đọc độ tương đồng item từ DB: {e}")
        return {}
    finally:
        conn.close()

    if not sim_rows:
        logger.warning("Không có độ tương đồng item được tìm thấy trong DB. Không thể tạo đề xuất dựa trên độ tương đồng.")
        return {}

    sim_dict: Dict[int, List[Tuple[int, float]]] = defaultdict(list)
    for p1, p2, s in sim_rows:
        # Ép kiểu 's' (score) sang float ngay khi đọc từ DB
        sim_dict[p1].append((p2, float(s)))
        sim_dict[p2].append((p1, float(s))) # Thêm đối xứng để dễ tra cứu

    user_recs: Dict[int, List[Tuple[int, float]]] = {}

    # Lấy TẤT CẢ các sản phẩm mà người dùng đã tương tác (sản phẩm hạt giống)
    # Chúng ta sẽ sử dụng tất cả các product_id có trong df_weighted_events cho mỗi user_id
    # Đây là các sản phẩm mà người dùng đã "quan tâm" dưới mọi hình thức (view, cart, wishlist, purchase)
    user_seed_products_map = df_weighted_events.groupby('user_id')['product_id'].apply(set).to_dict()

    # Lấy các sản phẩm ĐÃ MUA từ TOÀN BỘ DỮ LIỆU ĐÃ GÁN TRỌNG SỐ
    # Đây là danh sách các sản phẩm cần loại bỏ khỏi đề xuất
    user_purchased_products_to_exclude_map = df_weighted_events[df_weighted_events['event_type'] == 'purchase'] \
                                                    .groupby('user_id')['product_id'].apply(set).to_dict()

    all_users = df_weighted_events['user_id'].unique()
    logger.info(f"Tổng số người dùng cần tạo đề xuất: {len(all_users)}")

    for u in all_users:
        # Lấy các sản phẩm mà người dùng đã tương tác để làm "hạt giống"
        seed_products = user_seed_products_map.get(u, set())
        # Lấy các sản phẩm mà người dùng đã MUA để loại bỏ khỏi đề xuất
        products_to_exclude = user_purchased_products_to_exclude_map.get(u, set())

        scores: Dict[int, float] = defaultdict(float)

        if not seed_products:
            # logger.debug(f"Người dùng {u} chưa có tương tác nào để làm hạt giống, bỏ qua.")
            continue # Bỏ qua người dùng chưa có tương tác nào để làm hạt giống

        for p in seed_products:
            # Lấy các item tương tự từ sim_dict (đã chứa độ tương đồng lai)
            for q, s_from_sim_dict in sim_dict.get(p, []):
                # Đảm bảo KHÔNG đề xuất lại sản phẩm đã MUA
                if q not in products_to_exclude:
                    scores[q] += s_from_sim_dict

        # Lọc ra các sản phẩm có điểm số và sắp xếp
        if scores:
            user_recs[u] = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
        else:
            user_recs[u] = [] # Không có đề xuất nào nếu không có điểm

    logger.info("Hoàn tất tạo đề xuất lai cho người dùng.")
    return user_recs

print("\n--- Bắt đầu tạo đề xuất lai (Hybrid Recommendations) cho người dùng ---")
# Đảm bảo df_weighted_events_for_final_model đã được tạo ở Cell 6 trước đó
# Dòng này giả định df_weighted_events_for_final_model đã được tạo ra và chứa cột 'implicit_score'
# và 'event_type' cùng với 'user_id' và 'product_id'.
if 'df_weighted_events_for_final_model' not in locals():
    logger.error("df_weighted_events_for_final_model chưa được định nghĩa. Hãy chạy Cell 6 trước.")
    raise NameError("df_weighted_events_for_final_model is not defined. Please run Cell 6.")

user_recs = generate_hybrid_recommendations(df_weighted_events_for_final_model, TOP_N_RECOMMENDATIONS)
print(f"Đã tạo đề xuất lai cho {len(user_recs)} người dùng.")

# Hiển thị một vài ví dụ về đề xuất
if user_recs:
    print("\n--- 5 ví dụ đầu tiên về đề xuất lai cho người dùng (User ID: [List of (Product ID, Score)]) ---")
    count = 0
    for user_id, recs_list in user_recs.items():
        if recs_list: # Chỉ in ra nếu có đề xuất thực sự
            print(f"User ID {user_id}: {recs_list}")
            count += 1
        if count >= 5:
            break
    if count == 0:
        print("Không có người dùng nào có đề xuất được tạo.")
else:
    print("\nKhông có đề xuất nào được tạo cho bất kỳ người dùng nào.")


# 7. Lưu trữ đề xuất người dùng vào cơ sở dữ liệu
def save_recommendations(user_recs_to_save: Dict[int, List[Tuple[int, float]]]):
    """
    Lưu trữ đề xuất của người dùng vào bảng user_recommendations trong cơ sở dữ liệu.
    Xóa đề xuất cũ cho người dùng trước khi thêm mới.
    """
    if not user_recs_to_save:
        logger.warning("Không có đề xuất nào để lưu trữ.")
        return

    try:
        total_recs_saved = 0
        with engine.begin() as conn: # Sử dụng engine.begin() cho transaction tự động commit/rollback
            for user_id, recs in user_recs_to_save.items():
                # Xóa đề xuất cũ của người dùng này
                conn.execute(text("DELETE FROM user_recommendations WHERE user_id = :uid"), {'uid': user_id})

                # Chèn đề xuất mới
                if recs: # Chỉ chèn nếu có đề xuất thực sự
                    insert_values = [{'user_id': user_id, 'product_id': pid, 'score': float(score)} for pid, score in recs]
                    # Sử dụng text() cho tên bảng nếu cần, nhưng SQLAlchemy Core thường tốt hơn
                    conn.execute(
                        text("INSERT INTO user_recommendations (user_id, product_id, score) VALUES (:user_id, :product_id, :score)"),
                        insert_values # Truyền danh sách dict cho insert nhiều dòng
                    )
                    total_recs_saved += len(recs)
        logger.info(f"Đã lưu {total_recs_saved} đề xuất cho {len(user_recs_to_save)} người dùng thành công.")
    except Exception as e:
        logger.exception("Lỗi khi lưu đề xuất người dùng: %s", e)

print("\n--- Bắt đầu lưu trữ đề xuất lai cho người dùng vào cơ sở dữ liệu ---")
save_recommendations(user_recs) # Sử dụng user_recs đã tạo ở trên
print("--- Hoàn tất lưu trữ đề xuất lai cho người dùng ---")

print("\n--- Toàn bộ quy trình đề xuất lai đã hoàn thành thành công! ---")



# # Cell 7: Tạo và lưu trữ Recommendations cho người dùng

# # 6. Tạo đề xuất cho người dùng dựa trên độ tương đồng LAI và các sản phẩm đã mua
# def generate_hybrid_recommendations(df_weighted_events: pd.DataFrame, top_n: int = TOP_N_RECOMMENDATIONS) -> Dict[int, List[Tuple[int, float]]]:
#     """
#     Tạo đề xuất sản phẩm cho người dùng dựa trên độ tương đồng item-item đã được tính toán (lai).
#     Sử dụng các sản phẩm đã mua của người dùng làm "hạt giống" để tìm các sản phẩm tương tự chưa mua.
#     """
#     logger.info("Đang tạo đề xuất lai cho người dùng...")

#     # Đảm bảo df_weighted_events không rỗng
#     if df_weighted_events.empty:
#         logger.warning("DataFrame sự kiện có trọng số rỗng. Không thể tạo đề xuất.")
#         return {}

#     # Đọc tất cả các cặp tương đồng LAI từ DB
#     conn = engine.connect()
#     try:
#         # Giả định bảng item_similarity hiện tại chứa độ tương đồng lai từ Cell 6
#         sim_rows = conn.execute(text("SELECT product_id_1, product_id_2, score FROM item_similarity")).fetchall()
#         logger.info(f"Đã đọc {len(sim_rows)} cặp độ tương đồng lai từ cơ sở dữ liệu.")
#     except Exception as e:
#         logger.error(f"Lỗi khi đọc độ tương đồng item từ DB: {e}")
#         return {}
#     finally:
#         conn.close()

#     if not sim_rows:
#         logger.warning("Không có độ tương đồng item được tìm thấy trong DB. Không thể tạo đề xuất dựa trên độ tương đồng.")
#         return {}

#     sim_dict: Dict[int, List[Tuple[int, float]]] = defaultdict(list)
#     for p1, p2, s in sim_rows:
#         # Ép kiểu 's' (score) sang float ngay khi đọc từ DB
#         sim_dict[p1].append((p2, float(s)))
#         sim_dict[p2].append((p1, float(s))) # Thêm đối xứng để dễ tra cứu

#     user_recs: Dict[int, List[Tuple[int, float]]] = {}
#     # Lấy các sản phẩm đã mua từ TOÀN BỘ DỮ LIỆU ĐÃ GÁN TRỌNG SỐ
#     user_purchases_map = df_weighted_events[df_weighted_events['event_type'] == 'purchase'] \
#                                      .groupby('user_id')['product_id'].apply(set).to_dict()

#     all_users = df_weighted_events['user_id'].unique()
#     logger.info(f"Tổng số người dùng cần tạo đề xuất: {len(all_users)}")

#     for u in all_users:
#         purchased = user_purchases_map.get(u, set())
#         scores: Dict[int, float] = defaultdict(float)

#         if not purchased:
#             # logger.debug(f"Người dùng {u} chưa mua sản phẩm nào, bỏ qua.")
#             continue # Bỏ qua người dùng chưa có sản phẩm đã mua để làm hạt giống

#         for p in purchased:
#             # Lấy các item tương tự từ sim_dict (đã chứa độ tương đồng lai)
#             for q, s_from_sim_dict in sim_dict.get(p, []):
#                 if q not in purchased: # Đảm bảo không đề xuất lại sản phẩm đã mua
#                     scores[q] += s_from_sim_dict

#         # Lọc ra các sản phẩm có điểm số và sắp xếp
#         if scores:
#             user_recs[u] = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_n]
#         else:
#             user_recs[u] = [] # Không có đề xuất nào nếu không có điểm

#     logger.info("Hoàn tất tạo đề xuất lai cho người dùng.")
#     return user_recs

# print("\n--- Bắt đầu tạo đề xuất lai (Hybrid Recommendations) cho người dùng ---")
# # Đảm bảo df_weighted_events_for_final_model đã được tạo ở Cell 6 trước đó
# if 'df_weighted_events_for_final_model' not in locals():
#     logger.error("df_weighted_events_for_final_model chưa được định nghĩa. Hãy chạy Cell 6 trước.")
#     raise NameError("df_weighted_events_for_final_model is not defined. Please run Cell 6.")

# user_recs = generate_hybrid_recommendations(df_weighted_events_for_final_model, TOP_N_RECOMMENDATIONS)
# print(f"Đã tạo đề xuất lai cho {len(user_recs)} người dùng.")

# # Hiển thị một vài ví dụ về đề xuất
# if user_recs:
#     print("\n--- 5 ví dụ đầu tiên về đề xuất lai cho người dùng (User ID: [List of (Product ID, Score)]) ---")
#     count = 0
#     for user_id, recs_list in user_recs.items():
#         if recs_list: # Chỉ in ra nếu có đề xuất thực sự
#             print(f"User ID {user_id}: {recs_list}")
#             count += 1
#         if count >= 5:
#             break
#     if count == 0:
#         print("Không có người dùng nào có đề xuất được tạo.")
# else:
#     print("\nKhông có đề xuất nào được tạo cho bất kỳ người dùng nào.")


# # 7. Lưu trữ đề xuất người dùng vào cơ sở dữ liệu
# def save_recommendations(user_recs_to_save: Dict[int, List[Tuple[int, float]]]):
#     """
#     Lưu trữ đề xuất của người dùng vào bảng user_recommendations trong cơ sở dữ liệu.
#     Xóa đề xuất cũ cho người dùng trước khi thêm mới.
#     """
#     if not user_recs_to_save:
#         logger.warning("Không có đề xuất nào để lưu trữ.")
#         return

#     try:
#         total_recs_saved = 0
#         with engine.begin() as conn: # Sử dụng engine.begin() cho transaction tự động commit/rollback
#             for user_id, recs in user_recs_to_save.items():
#                 # Xóa đề xuất cũ của người dùng này
#                 conn.execute(text("DELETE FROM user_recommendations WHERE user_id = :uid"), {'uid': user_id})

#                 # Chèn đề xuất mới
#                 if recs: # Chỉ chèn nếu có đề xuất thực sự
#                     insert_values = [{'user_id': user_id, 'product_id': pid, 'score': float(score)} for pid, score in recs]
#                     # Sử dụng text() cho tên bảng nếu cần, nhưng SQLAlchemy Core thường tốt hơn
#                     conn.execute(
#                         text("INSERT INTO user_recommendations (user_id, product_id, score) VALUES (:user_id, :product_id, :score)"),
#                         insert_values # Truyền danh sách dict cho insert nhiều dòng
#                     )
#                     total_recs_saved += len(recs)
#         logger.info(f"Đã lưu {total_recs_saved} đề xuất cho {len(user_recs_to_save)} người dùng thành công.")
#     except Exception as e:
#         logger.exception("Lỗi khi lưu đề xuất người dùng: %s", e)

# print("\n--- Bắt đầu lưu trữ đề xuất lai cho người dùng vào cơ sở dữ liệu ---")
# save_recommendations(user_recs) # Sử dụng user_recs đã tạo ở trên
# print("--- Hoàn tất lưu trữ đề xuất lai cho người dùng ---")

# print("\n--- Toàn bộ quy trình đề xuất lai đã hoàn thành thành công! ---")


# In[ ]:





# In[ ]:





# In[ ]:




