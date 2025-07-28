#!/usr/bin/env python
# coding: utf-8

# In[8]:


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
import re

# === CONFIGURATION ===
# Các biến môi trường cho DB vẫn giữ nguyên để kết nối cơ sở dữ liệu
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '') # THAY THẾ BẰNG PASSWORD CỦA BẠN NẾU CÓ
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'thesis')

# URL của API Laravel để lấy cấu hình
LARAVEL_SETTINGS_API_URL = os.getenv('LARAVEL_SETTINGS_API_URL', 'http://localhost:8000/api/recommender/settings')

# URL của API Laravel để lấy dữ liệu thuộc tính sản phẩm (bao gồm EAV)
LARAVEL_PRODUCT_FEATURES_API_URL = os.getenv('LARAVEL_PRODUCT_FEATURES_API_URL', 'http://localhost:8000/api/product-features')

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
        'TOP_N_RECOMMENDATIONS': 15,
        'COSINE_THRESHOLD': 0.1,
        # 'HYBRID_ALPHA': 0.5,
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
# HYBRID_ALPHA = APP_SETTINGS['HYBRID_ALPHA']
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
    variant_spec_values = relationship("VariantSpecValue", back_populates="variant") # Thêm relationship này



class Specification(Base):
    __tablename__ = 'specifications'
    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey('categories.id'))
    name = Column(String(255), nullable=False)
    data_type = Column(String(50))
    unit = Column(String(50))
    description = Column(String(255))

    category = relationship("Category")
    spec_options = relationship("SpecOption", back_populates="specification")
    variant_spec_values = relationship("VariantSpecValue", back_populates="specification")

class SpecOption(Base):
    __tablename__ = 'spec_options'
    id = Column(Integer, primary_key=True)
    spec_id = Column(Integer, ForeignKey('specifications.id'))
    value = Column(String(255), nullable=False)

    specification = relationship("Specification", back_populates="spec_options")

class VariantSpecValue(Base):
    __tablename__ = 'variant_spec_values'
    id = Column(Integer, primary_key=True)
    variant_id = Column(Integer, ForeignKey('product_variants.id'))
    spec_id = Column(Integer, ForeignKey('specifications.id'))
    value_text = Column(String(255))
    value_int = Column(Integer)
    value_decimal = Column(Float)
    option_id = Column(Integer, ForeignKey('spec_options.id'))

    variant = relationship("Variant", back_populates="variant_spec_values")
    specification = relationship("Specification", back_populates="variant_spec_values")
    spec_options = relationship("SpecOption") # Tên là spec_options cho mối quan hệ one-to-one/many-to-one



print("--- Khởi tạo hệ thống và cấu hình hoàn tất ---")
print(f"Cơ sở dữ liệu đang kết nối: {DB_HOST}/{DB_NAME}")
print(f"Cài đặt hệ thống gợi ý đã tải: {APP_SETTINGS}") # In ra các cài đặt đã tải để kiểm tra




# In[9]:


import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Set
from collections import defaultdict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import re
import logging
import tensorflow as tf
from transformers import AutoTokenizer, AutoModel, TFAutoModel

# === Helper functions for Recommendation Metrics ===
# (Keep all helper functions as they are, they are not the source of the current issue)
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
    for i in range(min(n, len(actual_interactions))): 
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
# (Keep these as they are, they are not directly related to content issue)
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
    logger.debug(f"DEBUG_FUNC: weights in func: {weights}")
    logger.debug(f"DEBUG_FUNC: frequency_decay_factor in func: {frequency_decay_factor}")
    df_counts = df_copy.groupby(['user_id', 'product_id', 'event_type']).size().reset_index(name='interaction_count')
    max_weight = max(weights.values()) if weights else 1.0
    scaled_weights = {action: weight / max_weight for action, weight in weights.items()}
    df_counts['base_score'] = df_counts['event_type'].map(scaled_weights).fillna(0)
    df_counts['log_interaction_count'] = np.log1p(df_counts['interaction_count'])
    df_counts['frequency_score_addition'] = df_counts['base_score'] * df_counts['log_interaction_count'] * frequency_decay_factor
    df_counts['final_implicit_score'] = df_counts['base_score'] + df_counts['frequency_score_addition']
    
    if 'view' in weights and 'view' in df_counts['event_type'].unique():
        debug_view_rows = df_counts[df_counts['event_type'] == 'view'].head(5)
        logger.debug(f"DEBUG_FUNC: Debugging 'view' rows (before final clip):")
        logger.debug(debug_view_rows[['event_type', 'interaction_count', 'base_score', 'log_interaction_count', 'frequency_score_addition', 'final_implicit_score']].to_string(float_format='{:.10f}'.format))

    df_counts['final_implicit_score'] = df_counts['final_implicit_score'].clip(lower=0, upper=1.0)
    df_copy = df_copy.merge(
        df_counts[['user_id', 'product_id', 'event_type', 'final_implicit_score']],
        on=['user_id', 'product_id', 'event_type'],
        how='left'
    )
    df_copy['implicit_score'] = df_copy['final_implicit_score']
    df_copy.drop(columns=['final_implicit_score'], inplace=True)
    logger.info(f"Assigned implicit scores considering frequency with log transform. Min score: {df_copy['implicit_score'].min():.4f}, Max score: {df_copy['implicit_score'].max():.4f}")
    return df_copy

def split_data_time_based(df: pd.DataFrame, train_ratio: float = 0.6, val_ratio: float = 0.2, test_ratio: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    if not np.isclose(train_ratio + val_ratio + test_ratio, 1.0):
        raise ValueError("train_ratio + val_ratio + test_ratio must sum to 1.0")
    df = df.sort_values(by=['user_id', 'created_at']).reset_index(drop=True)
    df_train_indices = []
    df_val_indices = []
    df_test_indices = []
    for user_id, group_indices in df.groupby('user_id').groups.items():
        group = df.loc[group_indices].sort_values(by='created_at')
        total_interactions = len(group)
        train_split_point = int(total_interactions * train_ratio)
        val_split_point = int(total_interactions * (train_ratio + val_ratio))
        df_train_indices.extend(group.iloc[:train_split_point].index.tolist())
        df_val_indices.extend(group.iloc[train_split_point:val_split_point].index.tolist())
        df_test_indices.extend(group.iloc[val_split_point:].index.tolist())
    df_train = df.loc[df_train_indices].reset_index(drop=True)
    df_val = df.loc[df_val_indices].reset_index(drop=True)
    df_test = df.loc[df_test_indices].reset_index(drop=True)
    logger.info(f"Data split: Train {len(df_train)} events, Validation {len(df_val)} events, Test {len(df_test)} events.")
    return df_train, df_val, df_test

# === FUNCTIONS FOR CONTENT-BASED FILTERING (Item-Item) ===
# === NEW FUNCTION: Load CATEGORY_SPEC_CONFIG and UNIT_MAP from DB using existing EAV models ===
def load_eav_configs_from_db() -> Tuple[Dict[str, List[str]], Dict[str, Union[str, List[str]]]]:
    """
    Tải cấu hình các thuộc tính quan trọng theo danh mục (CATEGORY_SPEC_CONFIG)
    và ánh xạ đơn vị (UNIT_MAP) từ cơ sở dữ liệu, dựa trên mô hình EAV hiện có.
    """
    logger.info("Đang tải cấu hình thuộc tính sản phẩm (EAV) từ cơ sở dữ liệu...")
    category_spec_config = defaultdict(list)
    unit_map = {}
    db = None
    try:
        db = SessionLocal()
        
        # Truy vấn để lấy các thuộc tính (Specifications) liên quan đến Category
        # và cả đơn vị của chúng
        specs_query = db.query(
            Specification.name.label('spec_name'),
            Category.name.label('category_name'),
            Specification.unit.label('unit_value')
        ).outerjoin(Category, Specification.category_id == Category.id).all()

        for row in specs_query:
            spec_name = row.spec_name.strip() if row.spec_name else None
            category_name = row.category_name.strip() if row.category_name else None
            unit_value = row.unit_value.strip() if row.unit_value else None

            if spec_name:
                # Xây dựng UNIT_MAP
                if unit_value:
                    # Kiểm tra nếu unit_value có vẻ là JSON list (ví dụ: "['mAh','Wh']")
                    if unit_value.startswith('[') and unit_value.endswith(']'):
                        try:
                            # Thay thế ' bằng " để parse JSON hợp lệ
                            parsed_unit = json.loads(unit_value.replace("'", "\""))
                            if isinstance(parsed_unit, list):
                                unit_map[spec_name] = parsed_unit
                            else:
                                unit_map[spec_name] = unit_value
                        except json.JSONDecodeError:
                            logger.warning(f"Không thể parse đơn vị JSON '{unit_value}' cho spec '{spec_name}'. Lưu dưới dạng chuỗi.")
                            unit_map[spec_name] = unit_value
                    else:
                        unit_map[spec_name] = unit_value

                # Xây dựng CATEGORY_SPEC_CONFIG
                # Nếu một specification không có category_id (category_name là None),
                # nó có thể được coi là một spec chung hoặc spec "Default".
                # Tuy nhiên, thông thường spec sẽ có category_id rõ ràng.
                # Nếu bạn muốn một "Default" spec list, bạn cần xác định cách nó được lưu trong DB,
                # ví dụ: một hàng trong 'specifications' có category_id NULL và tên category "Default"
                # hoặc một cách khác để đánh dấu các spec chung.
                # Hiện tại, nếu category_name là None, chúng ta sẽ bỏ qua nó trong CATEGORY_SPEC_CONFIG
                # hoặc gán nó vào một category "Default" nếu có logic đó.
                if category_name:
                    category_spec_config[category_name].append(spec_name)
                # else:
                #     # Ví dụ: nếu bạn muốn các spec không có category cụ thể được gán vào 'Default'
                #     # Bạn cần đảm bảo logic này phù hợp với dữ liệu DB của bạn.
                #     category_spec_config['Default'].append(spec_name)

        # Đảm bảo rằng có một khóa 'Default' trong CATEGORY_SPEC_CONFIG
        # Nếu không có spec nào được gán cho category 'Default' trong DB,
        # chúng ta vẫn cần đảm bảo nó tồn tại để tránh lỗi KeyError sau này.
        if 'Default' not in category_spec_config:
            category_spec_config['Default'] = [] # Khởi tạo rỗng nếu không có trong DB
            logger.warning("Khoá 'Default' không được tìm thấy trong cấu hình thuộc tính từ DB. Đã khởi tạo 'Default' là rỗng.")


        logger.info(f"Đã tải thành công cấu hình thuộc tính và đơn vị từ DB.")
        return dict(category_spec_config), unit_map

    except Exception as e:
        logger.error(f"Lỗi khi tải cấu hình EAV từ DB: {type(e).__name__}: {e}")
        logger.warning("Sẽ sử dụng cấu hình mặc định cứng thay thế.")
        # Cung cấp cấu hình mặc định cứng trong trường hợp không tải được từ DB
        default_category_spec_config = {
            'Điện thoại': ['Màu sắc', 'Hệ điều hành', 'RAM', 'Dung lượng bộ nhớ', 'CPU', 'GPU', 'Độ phân giải camera sau', 'Công nghệ màn hình','Độ phân giải camera trước','Dung lượng pin'],
            'Laptop': ['CPU', 'RAM', 'VGA', 'Dung lượng bộ nhớ','GPU', 'Kích thước màn hình', 'Độ phân giải','Công nghệ màn hình','Loại RAM','Tốc độ bus RAM','Dung lượng pin'],
            'Tablet': ['Kích thước màn hình', 'Độ phân giải', 'RAM', 'CPU', 'Hệ điều hành','GPU','Dung lượng pin','Màu sắc','Camera sau','Camera trước','Dung lượng bộ nhớ'],
            'Tai nghe dây': ['Độ dài dây', 'Jack cắm', 'Tiện ích', 'Điều khiển', 'Màu sắc','Xuất xứ'],
            'Tai nghe bluetooth': ['Thời lượng pin tai nghe', 'Thời lượng pin hộp sạc', 'Cổng sạc', 'Công nghệ kết nối', 'Màu sắc','Xuất xứ','Tiện ích'],
            'Adapter sạc': ['Cổng ra', 'Loại sạc', 'Xuất xứ', 'Công nghệ'],
            'Cáp sạc': ['Công nghệ', 'Chức năng', 'Đầu vào','Đầu ra','Độ dài dây','Công suất tối đa','Xuất xứ'],
            'Ốp lưng': ['Loại vật liệu', 'Màu sắc', 'Tương thích'],
            'Sạc dự phòng': ['Loại sạc', 'Cổng ra', 'Lõi pin'],
            'Phụ kiện': [],
            'Default': ['Màu sắc', 'Công suất', 'Chất liệu', 'Kích thước', 'Khối lượng'] # Default cho các sản phẩm không có category_name hoặc category_name không khớp
        }
        default_unit_map = {
            'RAM': 'GB',
            'Dung lượng bộ nhớ': 'GB',
            'Dung lượng ổ cứng': 'GB',
            'Thời lượng pin': ['mAh','Wh'],
            'Công suất sạc': 'W'
        }
        return default_category_spec_config, default_unit_map
    finally:
        if db:
            db.close()

# Tải cấu hình thuộc tính và đơn vị ngay khi script bắt đầu
GLOBAL_CATEGORY_SPEC_CONFIG, GLOBAL_UNIT_MAP = load_eav_configs_from_db()

# === FUNCTIONS FOR CONTENT-BASED FILTERING (Item-Item) ===

def get_rich_product_data_from_db() -> pd.DataFrame:
    """
    Tải dữ liệu sản phẩm toàn diện bao gồm các biến thể và thông số kỹ thuật
    từ cơ sở dữ liệu bằng SQLAlchemy.
    SAU ĐÓ, GỘP DỮ LIỆU CÁC BIẾN THỂ VỀ CẤP SẢN PHẨM GỐC.
    """
    logger.info("Đang tải dữ liệu sản phẩm đầy đủ từ cơ sở dữ liệu...")

    # Sử dụng cấu hình đã tải từ DB thay vì set cứng
    CATEGORY_SPEC_CONFIG = GLOBAL_CATEGORY_SPEC_CONFIG
    UNIT_MAP = GLOBAL_UNIT_MAP

    db = None
    try:
        db = SessionLocal()
        products_query_results = db.query(
            Product.id,
            Product.name,
            Product.description,
            Category.name.label('category_name'),
            Brand.name.label('brand_name'),
            Variant.id.label('variant_id'),
            Variant.sku,
            Variant.price,
            Variant.discount,
            Specification.name.label('spec_name'),
            SpecOption.value.label('option_value'),
            VariantSpecValue.value_text,
            VariantSpecValue.value_int,
            VariantSpecValue.value_decimal
        ).join(Category, Product.cat_id == Category.id)\
        .join(Brand, Product.brand_id == Brand.id)\
        .join(Variant, Product.id == Variant.product_id)\
        .outerjoin(VariantSpecValue, Variant.id == VariantSpecValue.variant_id)\
        .outerjoin(Specification, VariantSpecValue.spec_id == Specification.id)\
        .outerjoin(SpecOption, VariantSpecValue.option_id == SpecOption.id)\
        .all()

        logger.debug(f"DEBUG: Số lượng bản ghi trả về từ DB: {len(products_query_results)}")
        if len(products_query_results) > 0:
            first_row = products_query_results[0]
            logger.debug(f"DEBUG: Dữ liệu hàng đầu tiên từ DB: Product ID: {first_row.id}, Category Name: '{first_row.category_name}', Brand Name: '{first_row.brand_name}'")
            try:
                # Cố gắng truy cập bằng _asdict() cho NamedTuple hoặc tương tự
                logger.debug(f"DEBUG: Tất cả các cột của hàng đầu tiên: {first_row._asdict()}")
            except AttributeError:
                # Fallback nếu không phải NamedTuple (ví dụ: là đối tượng row của SQLAlchemy)
                logger.debug(f"DEBUG: Tất cả các cột của hàng đầu tiên (fallback): {first_row.__dict__}")

        temp_variant_data = defaultdict(lambda: {
            'product_id': None,
            'product_name': None,
            'description': None,
            'category_name': None,
            'brand_name': None,
            'specs_by_variant': defaultdict(list)
        })

        for row in products_query_results:
            prod_id = row.id
            variant_id = row.variant_id
            
            current_category_name_raw = row.category_name
            if current_category_name_raw is None:
                logger.debug(f"DEBUG: Product ID {prod_id} có category_name là NONE.")
                processed_category_name = None
            else:
                logger.debug(f"DEBUG: category_name từ DB cho Product ID {prod_id}: '{current_category_name_raw}' (Loại: {type(current_category_name_raw)}, Độ dài: {len(current_category_name_raw)})")
                processed_category_name = current_category_name_raw.strip()
                if current_category_name_raw != processed_category_name:
                    logger.warning(f"DEBUG: category_name '{current_category_name_raw}' có khoảng trắng thừa! Sẽ dùng '{processed_category_name}' để tra cứu.")
            
            if temp_variant_data[prod_id]['product_id'] is None:
                temp_variant_data[prod_id]['product_id'] = prod_id
                temp_variant_data[prod_id]['product_name'] = row.name
                temp_variant_data[prod_id]['description'] = row.description
                temp_variant_data[prod_id]['category_name'] = processed_category_name
                temp_variant_data[prod_id]['brand_name'] = row.brand_name
            
            if variant_id is not None and row.spec_name:
                spec_value = row.option_value or row.value_text or row.value_int or row.value_decimal
                if spec_value is not None:
                    temp_variant_data[prod_id]['specs_by_variant'][variant_id].append({
                        'spec_name': row.spec_name.strip() if row.spec_name else None,
                        'value': spec_value
                    })

        final_product_level_data = []
        for prod_id, prod_info in temp_variant_data.items():
            product_name = prod_info['product_name']
            description = prod_info['description']
            category_name = prod_info['category_name']
            brand_name = prod_info['brand_name']

            all_variant_features_texts = []

            specs_to_include = []
            if category_name is None:
                logger.warning(f"Product ID {prod_id} có category_name là NONE. Sẽ sử dụng danh sách spec mặc định (Default).")
                specs_to_include = CATEGORY_SPEC_CONFIG.get('Default', [])
            elif category_name not in CATEGORY_SPEC_CONFIG:
                logger.warning(f"category_name '{category_name}' (product_id: {prod_id}) KHÔNG CÓ TRONG CATEGORY_SPEC_CONFIG. Sẽ sử dụng danh sách spec mặc định (Default).")
                specs_to_include = CATEGORY_SPEC_CONFIG.get('Default', [])
            else:
                specs_to_include = CATEGORY_SPEC_CONFIG[category_name]
            
            for var_id, var_specs_list in prod_info['specs_by_variant'].items():
                features_text_parts = [
                    brand_name,
                    category_name,
                    product_name,
                    description,
                ]
                
                spec_dict = {spec['spec_name']: spec['value'] for spec in var_specs_list if spec['spec_name']}

                for spec_name_from_db in specs_to_include:
                    if spec_name_from_db in spec_dict:
                        value = spec_dict[spec_name_from_db]
                        unit = UNIT_MAP.get(spec_name_from_db, '')
                        
                        if isinstance(unit, list):
                            unit = unit[0] if unit else '' # Lấy phần tử đầu tiên nếu là list đơn vị
                        features_text_parts.append(f"{spec_name_from_db} {value}{unit}")
                combined_variant_features = " ".join(filter(None, features_text_parts)).lower()
                combined_variant_features = re.sub(r'\s+', ' ', combined_variant_features).strip()
                all_variant_features_texts.append(combined_variant_features)
                
            product_level_features_text = " ".join(sorted(list(set(" ".join(all_variant_features_texts).split()))))

            if not product_level_features_text and (product_name or description or category_name or brand_name):
                product_level_features_text = " ".join(filter(None, [brand_name, category_name, product_name, description])).lower()
                product_level_features_text = re.sub(r'\s+', ' ', product_level_features_text).strip()

            final_product_level_data.append({
                'product_id': prod_id,
                'product_name': product_name,
                'description': description,
                'category_name': category_name,
                'brand_name': brand_name,
                'features_text': product_level_features_text
            })

        df = pd.DataFrame(final_product_level_data)
        logger.info(f"Đã tải và gộp thành công {len(df)} sản phẩm gốc.")
        return df

    except Exception as e:
        logger.error(f"Lỗi khi tải dữ liệu sản phẩm từ DB: {type(e).__name__}: {e}")
        return pd.DataFrame()
    finally:
        if db:
            db.close()



# Biến toàn cục cho BERT với TensorFlow
GLOBAL_BERT_TOKENIZER: AutoTokenizer = None
GLOBAL_BERT_MODEL: TFAutoModel = None # THAY ĐỔI Ở ĐÂY
GLOBAL_PRODUCT_EMBEDDINGS: tf.Tensor = None # THAY ĐỔI Ở ĐÂY
GLOBAL_PRODUCT_ID_MAP: Dict[int, int] = {}
TOP_K = 10 # Example value, make sure it's defined globally


def mean_pooling_tf(model_output, attention_mask):
    token_embeddings = model_output.last_hidden_state  # Lấy last_hidden_state từ TFBaseModelOutput
    input_mask_expanded = tf.cast(tf.expand_dims(attention_mask, -1), tf.float32)
    sum_embeddings = tf.reduce_sum(token_embeddings * input_mask_expanded, axis=1)
    sum_mask = tf.clip_by_value(tf.reduce_sum(input_mask_expanded, axis=1), 1e-9, tf.float32.max)
    return sum_embeddings / sum_mask


def initialize_global_bert_model(df_products_product_level: pd.DataFrame):
    global GLOBAL_BERT_TOKENIZER, GLOBAL_BERT_MODEL, GLOBAL_PRODUCT_EMBEDDINGS, GLOBAL_PRODUCT_ID_MAP
    
    if GLOBAL_BERT_MODEL is not None:
        logger.info("BERT model already initialized. Skipping re-initialization.")
        return

    logger.info("Initializing global Vietnamese-BERT model and generating embeddings (TensorFlow backend)...")
    
    # 1. Tải tokenizer và model BERT tiếng Việt
    # Vẫn dùng cùng tên mô hình, nhưng sẽ tải phiên bản TensorFlow
    model_name = "vinai/phobert-base" 
    try:
        GLOBAL_BERT_TOKENIZER = AutoTokenizer.from_pretrained(model_name)
        GLOBAL_BERT_MODEL = TFAutoModel.from_pretrained(model_name) # THAY ĐỔI Ở ĐÂY (TFAutoModel)
        logger.info("BERT model loaded for TensorFlow.")
    except Exception as e:
        logger.error(f"Lỗi khi tải tokenizer hoặc model BERT: {e}. Đảm bảo bạn đã cài đặt 'transformers' và 'tensorflow' và có kết nối internet.")
        return

    if df_products_product_level.empty or 'features_text' not in df_products_product_level.columns:
        logger.warning("No product data or 'features_text' found to generate embeddings.")
        return

    df_products_product_level['features_text'] = df_products_product_level['features_text'].fillna('')
    if df_products_product_level['features_text'].str.strip().eq('').all():
        logger.warning("All 'features_text' are empty. Cannot generate meaningful BERT embeddings.")
        return

    # 2. Tạo embeddings cho tất cả các features_text
    texts = df_products_product_level['features_text'].tolist()
    
    # Chia thành các batch để xử lý
    batch_size = 32 # Tùy chỉnh batch size tùy thuộc vào VRAM GPU hoặc RAM
    all_embeddings = []

    # Sử dụng tf.data.Dataset để xử lý batching hiệu quả hơn với TensorFlow
    dataset = tf.data.Dataset.from_tensor_slices(texts).batch(batch_size)

    for i, batch_texts in enumerate(dataset):
        # Decode tensor batch_texts to Python list of strings
        batch_texts_list = [t.decode('utf-8') for t in batch_texts.numpy()]
        
        encoded_input = GLOBAL_BERT_TOKENIZER(
            batch_texts_list, # Truyền list of strings
            padding=True, 
            truncation=True, 
            max_length=256, 
            return_tensors='tf' # THAY ĐỔI Ở ĐÂY
        )
        
        model_output = GLOBAL_BERT_MODEL(**encoded_input)
        
        # Thực hiện Mean Pooling để có được embedding của câu
        sentence_embeddings = mean_pooling_tf(model_output, encoded_input['attention_mask'])
        
        all_embeddings.append(sentence_embeddings)

    GLOBAL_PRODUCT_EMBEDDINGS = tf.concat(all_embeddings, axis=0) # Gộp tất cả embeddings lại
    logger.info(f"Global product embeddings shape: {GLOBAL_PRODUCT_EMBEDDINGS.shape}")

    GLOBAL_PRODUCT_ID_MAP = {pid: idx for idx, pid in enumerate(df_products_product_level['product_id'])}
    logger.info(f"Global BERT model initialized and embeddings generated successfully. Mapped {len(GLOBAL_PRODUCT_ID_MAP)} product IDs.")


def compute_content_similarity(df_products_for_map: pd.DataFrame, top_k: int = TOP_K) -> Dict[int, List[Tuple[int, float]]]:
    logger.info("Computing content-based item-item similarity at PRODUCT level using BERT embeddings (TensorFlow backend)...")

    if GLOBAL_BERT_MODEL is None or GLOBAL_PRODUCT_EMBEDDINGS is None:
        logger.error("Global BERT model or product embeddings not initialized. Cannot compute content similarity. Please call initialize_global_bert_model first.")
        return {}
    
    if GLOBAL_PRODUCT_EMBEDDINGS.shape[0] == 0:
        logger.warning("GLOBAL_PRODUCT_EMBEDDINGS is empty. Cannot compute content similarity.")
        return {}

    # Chuyển embeddings về dạng numpy array để dùng sklearn's cosine_similarity
    embeddings_np = GLOBAL_PRODUCT_EMBEDDINGS.numpy()
    
    content_sim_matrix = cosine_similarity(embeddings_np, dense_output=True) 

    logger.info(f"Content similarity matrix shape: {content_sim_matrix.shape}")
    
    content_similarities: Dict[int, List[Tuple[int, float]]] = {}
    index_to_product_id_map = {idx: pid for pid, idx in GLOBAL_PRODUCT_ID_MAP.items()}

    # Các product_id bạn muốn debug chi tiết (ví dụ: các sản phẩm Xiaomi, iPhone, Samsung từ trước)
    # target_product_ids = {64, 65, 66, 67, 74, 56, 58, 59, 73, 61} # Thêm các ID liên quan để debug

    for i, product_id_i in index_to_product_id_map.items():
        row = content_sim_matrix[i] 
        
        filtered_neighbors = []
        for j_idx, s in enumerate(row):
            if j_idx != i and s > 1e-6: # Ngưỡng nhỏ để loại bỏ noise
                filtered_neighbors.append((j_idx, s))

        if filtered_neighbors:
            topk_pairs = sorted(filtered_neighbors, key=lambda x: x[1], reverse=True)[:top_k]
            content_similarities[product_id_i] = [(index_to_product_id_map[j_idx], float(s)) for j_idx, s in topk_pairs]
            # Debugging cho các sản phẩm cụ thể
            # if product_id_i in target_product_ids:
            #     logger.info(f"  Top {len(content_similarities[product_id_i])} content-based similarities for {product_id_i}: {content_similarities[product_id_i]}")
        else:
            content_similarities[product_id_i] = []
            # if product_id_i in target_product_ids:
            #     logger.info(f"  No content-based similarities found (after filtering) for product {product_id_i}.")

    logger.info(f"Finished computing content-based item-item similarity for {len(content_similarities)} products.")
    all_scores = [score for sims in content_similarities.values() for _, score in sims]
    if all_scores:
        logger.info(f"Max content similarity score after filtering and top-k: {max(all_scores)}")
    else:
        logger.warning("No content similarities found after all processing steps.")
    return content_similarities

def combine_similarities(
    collab_sims: Dict[int, List[Tuple[int, float]]],
    content_sims: Dict[int, List[Tuple[int, float]]],
    alpha_base: float,
    item_interaction_counts: Dict[int, int],
    cold_start_threshold: int,
    top_k: int = 10,
    min_alpha_cold_start: float = 0.1
) -> Dict[int, List[Tuple[int, float, float, float]]]:
    logger.info(f"Combining similarities with base_alpha={alpha_base}, cold_start_threshold={cold_start_threshold}")

    hybrid_similarities_detail: Dict[int, Dict[int, Tuple[float, float, float]]] = defaultdict(lambda: defaultdict(lambda: (0.0, 0.0, 0.0)))

    all_product_ids = set(collab_sims.keys()).union(set(content_sims.keys()))

    for p1 in all_product_ids:
        p1_interactions = item_interaction_counts.get(p1, 0)

        dynamic_alpha = alpha_base
        if p1_interactions < cold_start_threshold:
            reduction_factor = (cold_start_threshold - p1_interactions) / cold_start_threshold
            dynamic_alpha = alpha_base * (1 - reduction_factor)
            dynamic_alpha = max(min_alpha_cold_start, dynamic_alpha)
            logger.debug(f"Product {p1} is cold-start ({p1_interactions} interactions < {cold_start_threshold}). Dynamic alpha adjusted to: {dynamic_alpha:.4f}")
        else:
            logger.debug(f"Product {p1} is warm-start ({p1_interactions} interactions >= {cold_start_threshold}). Dynamic alpha: {dynamic_alpha:.4f}")
        
        logger.info(f"DEBUGGING ALPHA: For p1={p1} (Interactions: {p1_interactions}), cold_start_threshold={cold_start_threshold}, dynamic_alpha used: {dynamic_alpha:.4f}")

        collab_neighbors_map = {p2: score for p2, score in collab_sims.get(p1, [])}
        content_neighbors_map = {p2: score for p2, score in content_sims.get(p1, [])}

        all_neighbors_for_p1 = set(collab_neighbors_map.keys()).union(set(content_neighbors_map.keys()))

        for p2 in all_neighbors_for_p1:
            if p1 == p2:
                continue

            cf_score = collab_neighbors_map.get(p2, 0.0)
            content_score = content_neighbors_map.get(p2, 0.0)

            hybrid_score = (dynamic_alpha * cf_score) + ((1 - dynamic_alpha) * content_score)

            hybrid_similarities_detail[p1][p2] = (
                max(0.0, float(hybrid_score)),
                max(0.0, float(cf_score)),
                max(0.0, float(content_score))
            )

    final_hybrid_sims: Dict[int, List[Tuple[int, float, float, float]]] = {}
    for p1, p2_scores_detail in hybrid_similarities_detail.items():
        sorted_neighbors = sorted(p2_scores_detail.items(), key=lambda x: x[1][0], reverse=True)[:top_k]
        final_hybrid_sims[p1] = [(p2, hs, cfs, cons) for p2, (hs, cfs, cons) in sorted_neighbors]

    logger.info(f"Finished combining similarities for {len(final_hybrid_sims)} products, now including detailed scores and dynamic alpha.")
    return final_hybrid_sims

# Ví dụ về hàm load_product_features
def load_product_features() -> pd.DataFrame:
    logger.info("Bắt đầu tải dữ liệu thuộc tính sản phẩm...")
    try:
        df_product_features = get_rich_product_data_from_db() # Gọi hàm đã sửa đổi
        if df_product_features.empty:
            logger.warning("DataFrame thuộc tính sản phẩm rỗng sau khi tải.")
        else:
            logger.info(f"Đã tải {len(df_product_features)} sản phẩm với thuộc tính.")
            # Debug: Kiểm tra một vài features_text đầu tiên
            logger.info("Sample features_text:")
            for i, row in df_product_features.head(5).iterrows():
                logger.info(f"  Product ID {row['product_id']}: {row['features_text'][:200]}...") # Giới hạn 200 ký tự để dễ đọc
        return df_product_features
    except Exception as e:
        logger.error(f"Lỗi khi tải dữ liệu thuộc tính sản phẩm: {e}")
        return pd.DataFrame()
        
def prepare_content_sim_for_lookup(content_sims: Dict[int, List[Tuple[int, float]]]) -> Dict[int, Dict[int, float]]:
    """
    Chuyển đổi Dict[int, List[Tuple[int, float]]] thành Dict[int, Dict[int, float]]
    để tra cứu độ tương đồng nội dung giữa hai sản phẩm nhanh hơn.
    """
    lookup_table = defaultdict(dict)
    for p1, neighbors in content_sims.items():
        for p2, sim_score in neighbors:
            lookup_table[p1][p2] = sim_score
            # Cosine similarity là đối xứng, nên thêm cả chiều ngược lại
            lookup_table[p2][p1] = sim_score
    return lookup_table

def mmr_diversity(
    candidate_items_with_scores: List[Tuple[int, float]],
    content_sim_lookup: Dict[int, Dict[int, float]],
    lambda_diversity: float,
    top_n: int
) -> List[Tuple[int, float]]:
    """
    Áp dụng thuật toán Maximal Marginal Relevance (MMR) để đa dạng hóa
    danh sách các sản phẩm đề xuất.

    Args:
        candidate_items_with_scores (List[Tuple[int, float]]): Danh sách các sản phẩm ứng viên
            và điểm số tương ứng của chúng (ví dụ: điểm hybrid score), đã được sắp xếp giảm dần
            theo điểm số.
        content_sim_lookup (Dict[int, Dict[int, float]]): Bảng tra cứu độ tương đồng nội dung
            giữa các cặp sản phẩm.
        lambda_diversity (float): Tham số cân bằng giữa sự liên quan (relevance) và đa dạng (diversity).
            Giá trị từ 0.0 (chỉ đa dạng) đến 1.0 (chỉ liên quan).
        top_n (int): Số lượng sản phẩm cuối cùng muốn đề xuất.

    Returns:
        List[Tuple[int, float]]: Danh sách top_n sản phẩm được đề xuất, đã được đa dạng hóa
            bởi MMR, cùng với điểm số gốc của chúng.
    """
    if not candidate_items_with_scores:
        logger.warning("Danh sách sản phẩm ứng viên rỗng. Không thể áp dụng MMR.")
        return []

    selected_recommendations: List[Tuple[int, float]] = []
    selected_items_ids: Set[int] = set()
    
    unselected_candidates = list(candidate_items_with_scores)

    # Bước 1: Chọn sản phẩm đầu tiên có điểm số cao nhất (relevance cao nhất)
    # Giả định `candidate_items_with_scores` đã được sắp xếp theo điểm relevance
    if not unselected_candidates:
        return []

    first_item = unselected_candidates[0]
    selected_recommendations.append(first_item)
    selected_items_ids.add(first_item[0])
    unselected_candidates.pop(0)

    logger.info(f"MMR: Đã chọn sản phẩm đầu tiên: {first_item[0]} với điểm {first_item[1]:.4f}")

    # Bước 2: Lặp lại cho đến khi đủ top_n sản phẩm
    while len(selected_recommendations) < top_n and unselected_candidates:
        best_mmr_score = -np.inf
        best_item_for_this_iteration = None
        index_to_remove = -1

        for idx, (candidate_item_id, relevance_score) in enumerate(unselected_candidates):
            # Tính max_similarity_to_selected_items
            max_sim_to_selected = 0.0
            for selected_item_id in selected_items_ids:
                sim = content_sim_lookup.get(candidate_item_id, {}).get(selected_item_id, 0.0)
                max_sim_to_selected = max(max_sim_to_selected, sim)
            
            # Tính điểm MMR
            # MMR = lambda * Relevance - (1 - lambda) * Max_Similarity_to_Selected
            mmr_score = (lambda_diversity * relevance_score) - ((1 - lambda_diversity) * max_sim_to_selected)
            
            # Chọn sản phẩm có điểm MMR cao nhất
            if mmr_score > best_mmr_score:
                best_mmr_score = mmr_score
                best_item_for_this_iteration = (candidate_item_id, relevance_score)
                index_to_remove = idx
        
        if best_item_for_this_iteration:
            selected_recommendations.append(best_item_for_this_iteration)
            selected_items_ids.add(best_item_for_this_iteration[0])
            unselected_candidates.pop(index_to_remove)
            logger.debug(f"MMR: Đã chọn sản phẩm {best_item_for_this_iteration[0]} (score: {best_item_for_this_iteration[1]:.4f}, MMR: {best_mmr_score:.4f})")
        else:
            logger.warning("MMR: Không tìm thấy sản phẩm ứng viên nào có điểm MMR dương hoặc không còn ứng viên. Dừng quá trình đa dạng hóa.")
            break

    logger.info(f"MMR: Hoàn tất đa dạng hóa. Đã chọn {len(selected_recommendations)} sản phẩm.")
    return selected_recommendations[:top_n]
print("--- Định nghĩa các hàm hỗ trợ và xử lý dữ liệu hoàn tất ---")


        


# In[16]:


# Cell 3: Tải dữ liệu và Chia tập Train/Validation/Test

# 1. Tải tất cả các sự kiện người dùng
print("--- Bắt đầu tải dữ liệu người dùng từ cơ sở dữ liệu ---")
df_raw_events = load_all_user_events()
# --- BẮT ĐẦU THÊM DEBUG Ở ĐÂY ---
print("\n--- DEBUG: Kiểm tra df_raw_events NGAY SAU KHI TẢI ---")
if 'df_raw_events' in locals() and not df_raw_events.empty:
    user_164_purchases_after_load = df_raw_events[
        (df_raw_events['user_id'] == 164) &
        (df_raw_events['event_type'] == 'purchase')
    ]
    print(f"\nPURCHASE EVENTS FOR USER 164 (from df_raw_events after load):")
    if not user_164_purchases_after_load.empty:
        # In tất cả các cột nếu cần, hoặc chỉ những cột quan trọng
        print(user_164_purchases_after_load[['user_id', 'product_id', 'event_type', 'created_at']].to_string())
        
        # Kiểm tra riêng các product_id bị thiếu
        missing_pids_to_check = [62, 65, 67]
        for pid in missing_pids_to_check:
            if pid in user_164_purchases_after_load['product_id'].values:
                print(f"  --> CONFIRMED: Product ID {pid} (purchase) IS present for User 164 in df_raw_events after load.")
            else:
                print(f"  --> MISSING: Product ID {pid} (purchase) IS NOT found for User 164 in df_raw_events after load. Problem likely in load_all_user_events().")
    else:
        print("Không tìm thấy sự kiện mua hàng cho User 164 trong df_raw_events sau khi tải.")
else:
    logger.error("df_raw_events không tồn tại hoặc rỗng ngay sau khi tải. Lỗi tải dữ liệu ban đầu.")
    raise NameError("df_raw_events is not defined or is empty after initial load.")
# --- KẾT THÚC DEBUG ---

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


# In[11]:


# Cell 4 Bayesian Optimization 
from skopt import gp_minimize
from skopt.space import Real, Integer
from skopt.utils import use_named_args
from skopt.plots import plot_convergence, plot_evaluations, plot_objective
import matplotlib.pyplot as plt
import json
import datetime
import os # Đảm bảo import os cho os.makedirs và os.path.join
from scipy.sparse import csr_matrix
from sklearn.metrics.pairwise import cosine_similarity
from collections import defaultdict
import numpy as np
import pandas as pd # Import pandas nếu chưa có (đảm bảo nó được import)
import logging # Đảm bảo logging được import nếu bạn sử dụng logger

# Cấu hình logger (Nếu chưa có ở các cell trước)
logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO) # Đặt mức độ log

print("\n--- Bắt đầu quá trình tối ưu hóa trọng số Implicit Feedback cho Hệ thống Lai bằng Bayesian Optimization ---")

# --- CHUẨN BỊ DỮ LIỆU CONTENT-BASED (CHỈ TẢI VÀ TẠO EMBEDDINGS MỘT LẦN) ---
# df_product_features, GLOBAL_BERT_TOKENIZER, GLOBAL_BERT_MODEL, GLOBAL_PRODUCT_EMBEDDINGS, GLOBAL_PRODUCT_ID_MAP
# Cần đảm bảo các biến này đã được tải và khởi tạo từ các cell trước
# Ví dụ: (giả sử các hàm này đã được định nghĩa ở các cell trước)
df_product_features = load_product_features()
initialize_global_bert_model(df_product_features) # Hàm này sẽ khởi tạo GLOBAL_PRODUCT_EMBEDDINGS

if 'df_product_features' not in locals() or df_product_features.empty:
    logger.error("df_product_features không tồn tại hoặc rỗng. Content-based Filtering sẽ không hoạt động.")
    # Các hàm liên quan đến BERT cần được đảm bảo đã chạy ở Cell 1 hoặc Cell 2
else:
    # Đảm bảo BERT model và embeddings đã được tải/khởi tạo
    if 'GLOBAL_BERT_MODEL' not in globals() or GLOBAL_BERT_MODEL is None or 'GLOBAL_PRODUCT_EMBEDDINGS' not in globals() or GLOBAL_PRODUCT_EMBEDDINGS is None:
        logger.error("Mô hình BERT hoặc embeddings không được khởi tạo thành công. Content-based Filtering sẽ không hoạt động.")
        # content_similarities_global = {} # Không cần biến này nữa

if 'df_train_raw' in locals() and not df_train_raw.empty:
    item_interaction_counts_global = df_train_raw['product_id'].value_counts().to_dict()
    logger.info(f"Đã tính toán số lượng tương tác cho {len(item_interaction_counts_global)} sản phẩm.")
else:
    logger.error("df_train_raw không tồn tại hoặc rỗng. Không thể tính item_interaction_counts_global.")
    item_interaction_counts_global = {} # Đặt rỗng để tránh lỗi

# --- HÀM compute_sparse_similarity ĐÃ ĐƯỢC THÊM VÀO ĐÂY ---
def compute_sparse_similarity(
    df: pd.DataFrame,
    top_k: int, # Tham số top_k sẽ được truyền từ objective
    threshold: float # Tham số threshold (cosine_threshold) sẽ được truyền từ objective
) -> Dict[int, List[Tuple[int, float]]]:
    """
    Tính toán độ tương đồng item-item cosine từ DataFrame với điểm phản hồi ngầm,
    trả về một từ điển chứa top-k item tương đồng cho mỗi item.
    """
    logger.info(f"Đang tính toán ma trận độ tương đồng item-item thưa thớt sử dụng điểm ngầm với top_k={top_k}, threshold={threshold:.4f}...")

    if 'implicit_score' not in df.columns:
        raise ValueError("DataFrame phải chứa cột 'implicit_score'.")

    df_filtered = df[df['implicit_score'] > 0].copy()

    logger.debug(f"DEBUG_SIM: Kích thước DataFrame đã lọc (implicit_score > 0): {len(df_filtered)} dòng")
    if df_filtered.empty:
        logger.warning("Không tìm thấy điểm ngầm dương nào để tính độ tương đồng. Trả về từ điển rỗng.")
        return {}

    active_users = df_filtered['user_id'].unique()
    active_items = df_filtered['product_id'].unique()
    logger.debug(f"DEBUG_SIM: Số lượng người dùng hoạt động duy nhất sau khi lọc: {len(active_users)}")
    logger.debug(f"DEBUG_SIM: Số lượng item hoạt động duy nhất sau khi lọc: {len(active_items)}")

    user_to_idx = {u: i for i, u in enumerate(active_users)}
    item_to_idx = {p: i for i, p in enumerate(active_items)}
    idx_to_item = {i: p for p, i in item_to_idx.items()}

    rows = df_filtered['user_id'].map(user_to_idx)
    cols = df_filtered['product_id'].map(item_to_idx)
    data = df_filtered['implicit_score'].astype(float).to_numpy()

    logger.debug(f"DEBUG_SIM: Kích thước của rows: {len(rows)}, cols: {len(cols)}, data: {len(data)}")

    if len(active_users) == 0 or len(active_items) == 0:
        logger.warning("Không đủ người dùng hoặc item duy nhất có điểm ngầm dương để tính toán độ tương đồng. Trả về từ điển rỗng.")
        return {}

    sparse_ui = csr_matrix((data, (rows, cols)), shape=(len(active_users), len(active_items)))
    logger.debug(f"DEBUG_SIM: Hình dạng ma trận User-Item thưa thớt: {sparse_ui.shape}, số lượng phần tử khác không (nnz): {sparse_ui.nnz}")

    # Chuyển đổi sang float32 để tránh lỗi bộ nhớ với ma trận lớn
    sparse_ui_T = sparse_ui.T.astype(np.float32)
    sim_matrix = cosine_similarity(sparse_ui_T, dense_output=False)
    logger.debug(f"DEBUG_SIM: Hình dạng ma trận độ tương đồng Item-Item thưa thớt: {sim_matrix.shape}, số lượng phần tử khác không (nnz): {sim_matrix.nnz}")

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
                # Sử dụng top_k được truyền vào
                topk_pairs = sorted(filtered_similarities, key=lambda x: x[1], reverse=True)[:top_k]
                item_similarities[original_product_id] = [(idx_to_item[j_idx], float(s)) for j_idx, s in topk_pairs]
            else:
                item_similarities[original_product_id] = []
        else:
            item_similarities[original_product_id] = []

    logger.info(f"DEBUG_SIM: Tổng số item (original_product_id) có ít nhất MỘT độ tương đồng HỢP LỆ (khác nó và >= ngưỡng): {count_items_with_any_similarity_after_threshold}")
    logger.info("Hoàn tất tính toán độ tương đồng thưa thớt.")
    return item_similarities


# --- ĐỊNH NGHĨA LẠI HÀM ĐÁNH GIÁ ĐỂ NHẬN THAM SỐ TỐI ƯU HÓA ---
def evaluate_weights_for_similarity(
    df_train_raw: pd.DataFrame,
    df_eval_raw: pd.DataFrame,
    current_weights: Dict[str, float],
    hybrid_alpha: float,
    cold_start_threshold: int,
    item_interaction_counts: Dict[int, int],
    frequency_decay_factor: float,
    final_hybrid_threshold: float,
    # --- THAM SỐ MỚI ĐƯỢC THÊM VÀO ĐÂY ---
    cosine_threshold: float, # Thêm tham số ngưỡng cosine
    num_similar_items: int, # Thêm tham số top_k cho content/CF
    top_n_recommendations: int, # Thêm tham số top_n_recommendations
    min_alpha_cold_start: float # <--- THAM SỐ MỚI ĐƯỢC THÊM VÀO
) -> Dict[str, float]:
    """
    Đánh giá chất lượng gợi ý (NDCG, Precision, Recall, MAP)
    cho một tập hợp trọng số phản hồi ngầm và trọng số lai (alpha) đã cho,
    sử dụng cả Collaborative Filtering và Content-based Filtering.
    """
    logger.debug(f"Đánh giá với trọng số: {current_weights}, alpha lai: {hybrid_alpha}, cold_start_threshold: {cold_start_threshold}")
    logger.debug(f" cosine_threshold={cosine_threshold}, num_similar_items={num_similar_items}, top_n_recommendations={top_n_recommendations}")


    df_train_weighted = assign_implicit_feedback_scores(
        df_train_raw.copy(),
        current_weights,
        frequency_decay_factor=frequency_decay_factor,
    )

    df_positive_scores = df_train_weighted[df_train_weighted['implicit_score'] > 0]
    logger.info(f"DEBUG_EVAL: Số lượng dòng có implicit_score > 0 trong df_train_weighted: {len(df_positive_scores)}")
    logger.info(f"DEBUG_EVAL: Số lượng người dùng duy nhất có implicit_score > 0 trong df_train_weighted: {df_positive_scores['user_id'].nunique()}")
    logger.info(f"DEBUG_EVAL: Số lượng sản phẩm duy nhất có implicit_score > 0 trong df_positive_scores: {df_positive_scores['product_id'].nunique()}")

    if df_train_weighted.empty or df_train_weighted['implicit_score'].sum() == 0:
        logger.warning("Không có dữ liệu huấn luyện có trọng số ý nghĩa cho CF. Trả về các số liệu bằng không.")
        return {'precision_at_n': 0.0, 'recall_at_n': 0.0, 'ndcg_at_n': 0.0, 'map': 0.0}
    logger.info(f"DF_TRAIN_WEIGHTED cho CF: {len(df_train_weighted)} dòng, min_score={df_train_weighted['implicit_score'].min():.2f}, max_score={df_train_weighted['implicit_score'].max():.2f}")

    # --- 1. Tính toán độ tương đồng Collaborative Filtering (CF) ---
    # Sử dụng num_similar_items và cosine_threshold từ tham số
    collab_similarities = compute_sparse_similarity(
        df_train_weighted, top_k=num_similar_items, threshold=cosine_threshold
    )
    logger.info(f"Số lượng item có độ tương đồng CF: {len(collab_similarities)}")

    # --- 1.1. Tính toán độ tương đồng Content-based ---
    # PHẢI GỌI HÀM NÀY BÊN TRONG HÀM ĐÁNH GIÁ để top_k có thể thay đổi
    # Sử dụng num_similar_items từ tham số
    # Đảm bảo df_product_features đã được tải và GLOBAL_PRODUCT_EMBEDDINGS đã được tạo
    content_sims = {}

    # --- ĐỊA ĐIỂM 1: KIỂM TRA TRƯỚC KHI TÍNH TOÁN CONTENT SIMILARITY ---
    logger.info(f"DEBUG_EVAL: Đang kiểm tra trạng thái trước khi tính toán Content Similarity với num_similar_items={num_similar_items}")
    
    # Kiểm tra sự tồn tại của biến toàn cục df_product_features
    if 'df_product_features' not in globals() or df_product_features.empty:
        logger.error("DEBUG_EVAL: df_product_features KHÔNG TỒN TẠI HOẶC RỖNG. Content-based sẽ bị ảnh hưởng.")
    else:
        logger.info(f"DEBUG_EVAL: df_product_features có {len(df_product_features)} dòng và {df_product_features['features_text'].count()} features_text không rỗng.")

    # Kiểm tra sự tồn tại của biến toàn cục GLOBAL_BERT_MODEL và GLOBAL_PRODUCT_EMBEDDINGS
    if 'GLOBAL_BERT_MODEL' not in globals() or GLOBAL_BERT_MODEL is None or 'GLOBAL_PRODUCT_EMBEDDINGS' not in globals() or GLOBAL_PRODUCT_EMBEDDINGS is None:
        logger.error("DEBUG_EVAL: GLOBAL_BERT_MODEL HOẶC GLOBAL_PRODUCT_EMBEDDINGS KHÔNG ĐƯỢC KHỞI TẠO. Content-based sẽ bị ảnh hưởng.")
    else:
        logger.info(f"DEBUG_EVAL: GLOBAL_PRODUCT_EMBEDDINGS có kích thước: {GLOBAL_PRODUCT_EMBEDDINGS.shape}.")
        if GLOBAL_PRODUCT_EMBEDDINGS.shape[0] > 0 and np.all(GLOBAL_PRODUCT_EMBEDDINGS[0].numpy() == 0): # Giả sử embeddings là tensor
            logger.error("DEBUG_EVAL: Embedding đầu tiên của sản phẩm là toàn số 0! Khả năng cao Content Score sẽ là 0.")
        elif GLOBAL_PRODUCT_EMBEDDINGS.shape[0] > 0:
            # Chuyển đổi tensor sang numpy để in ra
            logger.info(f"DEBUG_EVAL: 5 giá trị đầu của embedding sản phẩm đầu tiên: {GLOBAL_PRODUCT_EMBEDDINGS[0, :5].numpy().tolist()}")

    if 'df_product_features' in globals() and not df_product_features.empty and \
       'GLOBAL_PRODUCT_EMBEDDINGS' in globals() and GLOBAL_PRODUCT_EMBEDDINGS is not None:
        content_sims = compute_content_similarity(df_product_features, top_k=num_similar_items)
        logger.info(f"Hoàn tất tính toán độ tương đồng Content-based cho {len(content_sims)} sản phẩm.")
    else:
        logger.warning("Không có dữ liệu thuộc tính sản phẩm hoặc embeddings. Content-based Filtering không khả dụng.")

    # --- ĐỊA ĐIỂM 2: KIỂM TRA SAU KHI TÍNH TOÁN CONTENT SIMILARITY ---
    logger.info(f"DEBUG_EVAL: Số lượng sản phẩm có Content Similarities (sau khi tính toán): {len(content_sims)}")
    if content_sims:
        # Lấy một ID sản phẩm bất kỳ có độ tương đồng để kiểm tra
        first_product_id_with_sim = next(iter(content_sims), None)
        if first_product_id_with_sim is not None and content_sims[first_product_id_with_sim]:
            # Lấy 10 cặp đầu tiên hoặc tất cả nếu ít hơn 10
            sample_pairs = content_sims[first_product_id_with_sim][:min(10, len(content_sims[first_product_id_with_sim]))]
            logger.info(f"DEBUG_EVAL: Ví dụ Content Sim cho Product ID {first_product_id_with_sim} ({len(sample_pairs)} cặp đầu): {sample_pairs}")
            
            all_content_scores_in_batch = [s for _, s in content_sims[first_product_id_with_sim]]
            if all_content_scores_in_batch:
                logger.info(f"DEBUG_EVAL: Min Content Score trong ví dụ: {min(all_content_scores_in_batch):.10f}, Max Content Score trong ví dụ: {max(all_content_scores_in_batch):.10f}")
                logger.info(f"DEBUG_EVAL: Trung bình Content Score trong ví dụ: {np.mean(all_content_scores_in_batch):.10f}")
            else:
                logger.warning("DEBUG_EVAL: Ví dụ này không có cặp tương đồng sau khi lọc. (Có thể do num_similar_items quá thấp)")
        else:
            logger.warning("DEBUG_EVAL: content_sims có keys nhưng không có cặp tương đồng nào cho các sản phẩm đó.")
    else:
        logger.warning("DEBUG_EVAL: content_sims RỖNG hoàn toàn sau khi compute_content_similarity.")


    # --- 2. Kết hợp độ tương đồng CF và Content-based ---
    if not collab_similarities and not content_sims:
        logger.warning("Không có độ tương đồng CF hoặc Content-based. Không thể tạo gợi ý lai. Trả về các số liệu bằng không.")
        return {'precision_at_n': 0.0, 'recall_at_n': 0.0, 'ndcg_at_n': 0.0, 'map': 0.0}

    # Đảm bảo hàm combine_similarities có thể xử lý khi một trong hai dict rỗng
    # Hàm combine_similarities sẽ tự động bỏ qua các trường hợp không có dữ liệu
    # Sử dụng num_similar_items cho top_k trong combine_similarities
    hybrid_similarities = combine_similarities(
        collab_similarities,
        content_sims,
        hybrid_alpha, # alpha_base
        item_interaction_counts,
        cold_start_threshold,
        top_k=num_similar_items, # Sử dụng num_similar_items ở đây
        min_alpha_cold_start=min_alpha_cold_start # <--- TRUYỀN THAM SỐ MỚI VÀO ĐÂY
    )
    logger.info(f"Số lượng item có độ tương đồng lai: {len(hybrid_similarities)}")

    # <--- THÊM LOGIC LỌC FINAL_HYBRID_THRESHOLD TẠI ĐÂY ---
    if final_hybrid_threshold > 0: # Chỉ lọc nếu ngưỡng > 0
        filtered_hybrid_similarities = {}
        for p1, neighbours in hybrid_similarities.items():
            filtered_neighbours_for_p1 = []
            for p2, hybrid_score, cf_score, content_score in neighbours:
                if hybrid_score >= final_hybrid_threshold:
                    filtered_neighbours_for_p1.append((p2, hybrid_score, cf_score, content_score))
            if filtered_neighbours_for_p1:
                filtered_hybrid_similarities[p1] = filtered_neighbours_for_p1
            else: # Đảm bảo item vẫn có entry dù rỗng nếu không tìm được láng giềng
                filtered_hybrid_similarities[p1] = []
        hybrid_similarities = filtered_hybrid_similarities
        logger.info(f"Số lượng item có độ tương đồng lai (sau khi lọc final_hybrid_threshold): {len(hybrid_similarities)}")
    # --- KẾT THÚC LOGIC LỌC ---
    
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
            # Lấy hybrid_score từ tuple trả về của combine_similarities
            for q, hybrid_score, cf_score, content_score in hybrid_similarities.get(p, []):
                # Đảm bảo không gợi ý lại sản phẩm đã tương tác trong quá khứ
                if q not in train_purchased_items:
                    scores[q] += float(hybrid_score)

        # Sử dụng top_n_recommendations từ tham số mới
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


# Định nghĩa không gian tìm kiếm cho Bayesian Optimization
# Bây giờ bao gồm các trọng số sự kiện, alpha lai, cold_start_threshold,
# frequency_decay_factor, final_hybrid_threshold, COSINE_THRESHOLD, TOP_K, TOP_N_RECOMMENDATIONS
space = [
    Real(0.1, 0.2, name='view'),
    Real(0.2, 0.7, name='add_to_cart'),
    Real(0.1, 0.4, name='wishlist'),
    Real(0.0, 1.0, name='hybrid_alpha'),
    Integer(1, 20, name='cold_start_threshold'),
    Real(0.01, 0.5, name='frequency_decay_factor'),
    Real(0.0, 0.5, name='final_hybrid_threshold'),
    # --- THAM SỐ MỚI ĐƯỢC THÊM VÀO ĐÂY ---
    Real(0.0, 1.0, name='cosine_threshold'), # Ngưỡng tương đồng cosine
    Integer(5, 100, name='num_similar_items'), # top_k cho content-based và CF
    Integer(5, 10, name='top_n_recommendations'), # top_n khuyến nghị trả về
    Real(0.0, 0.5, name='min_alpha_cold_start'), # <--- THAM SỐ MỚI ĐƯỢC THÊM VÀO VỚI KHOẢNG [0.0, 0.5]

]

# Định nghĩa trọng số purchase cố định
FIXED_PURCHASE_WEIGHT = 1.0

@use_named_args(space)
def objective(
    view,
    add_to_cart,
    wishlist,
    hybrid_alpha,
    cold_start_threshold,
    frequency_decay_factor,
    final_hybrid_threshold,
    # --- THAM SỐ MỚI ĐƯỢC THÊM VÀO ĐÂY ---
    cosine_threshold,
    num_similar_items,
    top_n_recommendations,
    min_alpha_cold_start,
):
    current_weights = {
        'view': view,
        'add_to_cart': add_to_cart,
        'wishlist': wishlist,
        'purchase': FIXED_PURCHASE_WEIGHT
    }

    # Kiểm tra ràng buộc thứ tự cho trọng số phản hồi ngầm
    epsilon = 1e-6
    if not (current_weights['view'] < current_weights['wishlist'] - epsilon and
            current_weights['wishlist'] < current_weights['add_to_cart'] - epsilon and
            current_weights['add_to_cart'] < current_weights['purchase'] - epsilon):
        logger.warning(f"DEBUG_OBJ: Vi phạm ràng buộc thứ tự với trọng số ngầm: {current_weights}. Trả về 1.0.")
        return 1.0 # Giá trị cao, nghĩa là tệ, để Bayesian Opt không chọn

    # Kiểm tra ràng buộc cho hybrid_alpha (đã được định nghĩa trong space, nhưng kiểm tra lại)
    if not (0.0 <= hybrid_alpha <= 1.0):
        logger.warning(f"DEBUG_OBJ: hybrid_alpha ({hybrid_alpha}) nằm ngoài khoảng [0, 1]. Trả về 1.0.")
        return 1.0

    # Kiểm tra ràng buộc cho cold_start_threshold (đã được định nghĩa trong space)
    if not (1 <= cold_start_threshold <= 20):
        logger.warning(f"DEBUG_OBJ: cold_start_threshold ({cold_start_threshold}) nằm ngoài khoảng [1, 20]. Trả về 1.0.")
        return 1.0

    # Kiểm tra ràng buộc cho cosine_threshold (đã được định nghĩa trong space)
    if not (0.0 <= cosine_threshold <= 1.0):
        logger.warning(f"DEBUG_OBJ: cosine_threshold ({cosine_threshold}) nằm ngoài khoảng [0, 1]. Trả về 1.0.")
        return 1.0

    # Kiểm tra ràng buộc cho num_similar_items (đã được định nghĩa trong space)
    if not (5 <= num_similar_items <= 100):
        logger.warning(f"DEBUG_OBJ: num_similar_items ({num_similar_items}) nằm ngoài khoảng [5, 100]. Trả về 1.0.")
        return 1.0

    # Kiểm tra ràng buộc cho top_n_recommendations (đã được định nghĩa trong space)
    if not (5 <= top_n_recommendations <= 50):
        logger.warning(f"DEBUG_OBJ: top_n_recommendations ({top_n_recommendations}) nằm ngoài khoảng [5, 50]. Trả về 1.0.")
        return 1.0
     # <--- KIỂM TRA RÀNG BUỘC CHO THAM SỐ MỚI min_alpha_cold_start
    if not (0.0 <= min_alpha_cold_start <= 0.5): # Kiểm tra ràng buộc
        logger.warning(f"DEBUG_OBJ: min_alpha_cold_start ({min_alpha_cold_start}) nằm ngoài khoảng [0, 0.5]. Trả về 1.0.")
        return 1.0
    logger.info(f"DEBUG_OBJ: Đánh giá với trọng số: {current_weights}, alpha lai: {hybrid_alpha}, cold_start_threshold: {cold_start_threshold}, freq_decay: {frequency_decay_factor}, final_thresh: {final_hybrid_threshold}")
    logger.info(f"DEBUG_OBJ: cosine_threshold: {cosine_threshold}, num_similar_items: {num_similar_items}, top_n_recommendations: {top_n_recommendations}")


    evaluation_metrics = evaluate_weights_for_similarity(
        df_train_raw.copy(),
        df_val_raw.copy(),
        current_weights,
        hybrid_alpha,
        cold_start_threshold,
        item_interaction_counts_global, # Sử dụng item_interaction_counts_global đã tính toán 1 lần
        frequency_decay_factor,
        final_hybrid_threshold,
        # --- TRUYỀN THAM SỐ MỚI VÀO HÀM ĐÁNH GIÁ ---
        cosine_threshold=cosine_threshold,
        num_similar_items=num_similar_items,
        top_n_recommendations=top_n_recommendations,
        min_alpha_cold_start=min_alpha_cold_start, # <--- TRUYỀN THAM SỐ MỚI

    )

    score_to_minimize = -evaluation_metrics['ndcg_at_n']
    logger.info(f"DEBUG_OBJ: NDCG@{top_n_recommendations}: {evaluation_metrics['ndcg_at_n']:.4f}, Optimization Score: {score_to_minimize:.4f}")
    return score_to_minimize

# --- THAY THẾ CÁC BIẾN TOÀN CỤC BẰNG BIẾN CỤC BỘ HOẶC THAM SỐ HÀM ---
# Loại bỏ các dòng sau nếu chúng lấy giá trị từ APP_SETTINGS và bạn muốn tối ưu hóa chúng
# BATCH_SIZE = APP_SETTINGS['BATCH_SIZE']
# TOP_K = APP_SETTINGS['TOP_K'] # KHÔNG CẦN NỮA VÌ ĐƯỢC TỐI ƯU HÓA LÀ num_similar_items
# TOP_N_RECOMMENDATIONS = APP_SETTINGS['TOP_N_RECOMMENDATIONS'] # KHÔNG CẦN NỮA VÌ ĐƯỢC TỐI ƯU HÓA
# COSINE_THRESHOLD = APP_SETTINGS['COSINE_THRESHOLD'] # KHÔNG CẦN NỮA VÌ ĐƯỢC TỐI ƯU HÓA

# Cấu hình logging để xem tiến trình tối ưu hóa
logging.getLogger('skopt').setLevel(logging.WARNING) # Giảm log của skopt nếu quá nhiều

# Thực hiện tối ưu hóa Bayesian nếu dữ liệu đủ
# common_users_for_eval cần được định nghĩa ở cell trước đó (ví dụ: trong quá trình chia tập dữ liệu)
if (('df_raw_events' in locals() and not df_raw_events.empty) and
    ('common_users_for_eval' in locals() and len(common_users_for_eval) > 0) and
    ('df_train_raw' in locals() and not df_train_raw.empty) and
    ('df_val_raw' in locals() and not df_val_raw.empty)):
    logger.info("Bắt đầu tối ưu hóa Bayesian...")
    result = gp_minimize(
        objective,
        space,
        n_calls=100, # Số lượng lần gọi hàm mục tiêu
        n_random_starts=20, # Số lượng điểm khởi tạo ngẫu nhiên
        random_state=42,
        verbose=True
    )

    # Trích xuất trọng số tối ưu
    # Các chỉ số của result.x sẽ tương ứng với thứ tự trong 'space'
    # Cần cập nhật các chỉ số này để phù hợp với `space` mới
    optimal_weights = {
        'view': result.x[0],
        'add_to_cart': result.x[1],
        'wishlist': result.x[2],
        'purchase': FIXED_PURCHASE_WEIGHT
    }
    optimal_hybrid_alpha = result.x[3]
    optimal_cold_start_threshold = int(result.x[4])
    optimal_frequency_decay_factor = result.x[5]
    optimal_final_hybrid_threshold = result.x[6]
    # --- TRÍCH XUẤT CÁC THAM SỐ MỚI ---
    optimal_cosine_threshold = result.x[7]
    optimal_num_similar_items = int(result.x[8])
    optimal_top_n_recommendations = int(result.x[9])
    optimal_min_alpha_cold_start = result.x[10] # <--- TRÍCH XUẤT THAM SỐ MỚI


    best_ndcg = -result.fun # result.fun là giá trị tối thiểu của hàm mục tiêu (-NDCG)
    print(f"\n--- Trọng số tối ưu tìm được bằng Bayesian Optimization trên tập Validation: {optimal_weights} ---")
    print(f"--- Alpha lai tối ưu: {optimal_hybrid_alpha:.4f} ---")
    print(f"--- Ngưỡng Cold-Start tối ưu: {optimal_cold_start_threshold} ---")
    print(f"--- Frequency Decay Factor tối ưu: {optimal_frequency_decay_factor:.4f} ---")
    print(f"--- Ngưỡng Lai Cuối Cùng tối ưu: {optimal_final_hybrid_threshold:.4f} ---")
    print(f"--- Ngưỡng Cosine tối ưu: {optimal_cosine_threshold:.4f} ---") # In ra
    print(f"--- Số lượng Item Tương đồng tối ưu (TOP_K): {optimal_num_similar_items} ---") # In ra
    print(f"--- Số lượng Khuyến nghị trả về tối ưu (TOP_N_RECOMMENDATIONS): {optimal_top_n_recommendations} ---") # In ra
    print(f"--- Min Alpha Cold-Start tối ưu: {optimal_min_alpha_cold_start:.4f} ---") # <--- IN RA THAM SỐ MỚI
    print(f"--- Với điểm NDCG tốt nhất: {best_ndcg:.4f} ---")


    # --- THÊM PHẦN LƯU TRỮ TRỌNG SỐ VÀO TỆP JSON TẠY ĐÂY ---
    results_dir = 'optimization_results'
    os.makedirs(results_dir, exist_ok=True) # Đảm bảo thư mục tồn tại

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    weights_file_name = os.path.join(results_dir, f'optimal_hybrid_weights_{timestamp}.json')

    try:
        with open(weights_file_name, 'w') as f:
            json.dump({
                "optimal_implicit_weights": optimal_weights,
                "optimal_hybrid_alpha": optimal_hybrid_alpha,
                "optimal_cold_start_threshold": int(optimal_cold_start_threshold),
                "optimal_frequency_decay_factor": optimal_frequency_decay_factor,
                "optimal_final_hybrid_threshold": optimal_final_hybrid_threshold,
                "optimal_cosine_threshold": optimal_cosine_threshold, # Lưu
                "optimal_num_similar_items": int(optimal_num_similar_items), # Lưu
                "optimal_top_n_recommendations": int(optimal_top_n_recommendations), # Lưu
                "optimal_min_alpha_cold_start": optimal_min_alpha_cold_start, # <--- LƯU THAM SỐ MỚI
                "best_ndcg": best_ndcg,
                "optimization_timestamp": timestamp
            }, f, indent=4)
        print(f"\n--- Trọng số lai tối ưu đã được lưu vào: {weights_file_name} ---")
    except Exception as e:
        print(f"\n--- Lỗi khi lưu trọng số vào tệp JSON: {e} ---")

    # --- KẾT THÚC PHẦN LƯU TRỮ ---
    
    # print(f"\n--- Đang vẽ biểu đồ hội tụ ---")
    try:
        plot_convergence(result)
        plt.title('Bayesian Optimization Convergence Plot')
        plt.xlabel('Number of calls')
        plt.ylabel('Minimum objective value found')
        plt.grid(True)
        plt.show()
        print("Đã vẽ biểu đồ hội tụ thành công.")
    except Exception as e:
        print(f"Lỗi khi vẽ biểu đồ hội tụ: {e}")

else:
    logger.warning("Bỏ qua Tối ưu hóa Bayesian do không đủ dữ liệu để đánh giá (ví dụ: không có người dùng chung để đánh giá hoặc df_train_raw/df_val_raw rỗng).")

print("\n--- Hoàn tất quá trình tối ưu hóa trọng số Implicit Feedback cho Hệ thống Lai ---")


# In[12]:


# Cell 5: Đánh giá hiệu suất cuối cùng trên Test Set

import requests # Đảm bảo import requests cho việc gọi API
import json # Đảm bảo import json
import matplotlib.pyplot as plt
import seaborn as sns # Thêm dòng này nếu chưa có ở các Cell trước
import logging # Đảm bảo logging được import nếu bạn sử dụng logger

# Cấu hình logger (Nếu chưa có ở các cell trước)
logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO) # Đặt mức độ log

print("\n--- Bắt đầu đánh giá hiệu suất cuối cùng trên tập Test độc lập ---")

# Đảm bảo df_train_raw và df_test_raw được giữ nguyên từ Cell 3
# Cần đảm bảo các biến `optimal_weights`, `optimal_hybrid_alpha`, `optimal_cold_start_threshold`,
# `optimal_frequency_decay_factor`, `optimal_final_hybrid_threshold`,
# `optimal_cosine_threshold`, `optimal_num_similar_items`, `optimal_top_n_recommendations`
# đã được định nghĩa từ quá trình tối ưu hóa ở Cell 4.

# --- SỬA LỖI: Đổi thứ tự và thêm tham số cho hàm evaluate_weights_for_similarity ---
final_evaluation_metrics = evaluate_weights_for_similarity(
    df_train_raw.copy(),
    df_test_raw.copy(),
    optimal_weights,
    optimal_hybrid_alpha,
    optimal_cold_start_threshold,
    item_interaction_counts_global, # Tham số item_interaction_counts_global
    optimal_frequency_decay_factor,
    optimal_final_hybrid_threshold,
    optimal_cosine_threshold,     # Tham số mới
    optimal_num_similar_items,    # Tham số mới
    optimal_top_n_recommendations,# Tham số mới
    optimal_min_alpha_cold_start # <-- THÊM DÒNG NÀY

)

print(f"\n--- Hiệu suất mô hình cuối cùng trên tập Test Set với TOP_N={optimal_top_n_recommendations} ---")
for metric, score in final_evaluation_metrics.items():
    print(f"- {metric}: {score:.4f}")

# Trực quan hóa kết quả đánh giá cuối cùng
metrics_names = list(final_evaluation_metrics.keys())
metrics_values = list(final_evaluation_metrics.values())

plt.figure(figsize=(8, 5))
sns.barplot(x=metrics_names, y=metrics_values, palette='viridis')
plt.title(f'Hiệu suất mô hình trên tập Test (N={optimal_top_n_recommendations})') # Cập nhật N
plt.ylabel('Điểm số')
plt.ylim(0, 1) # Đảm bảo trục Y từ 0 đến 1
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.show()

print("\n--- Hoàn tất đánh giá hiệu suất cuối cùng trên tập Test độc lập ---")

# --- BẮT ĐẦU PHẦN MỚI: Gửi dữ liệu hiệu suất lên API Laravel ---
print("\n--- Gửi dữ liệu hiệu suất lên API Laravel ---")

# URL của API endpoint của bạn
API_URL = "http://localhost:8000/api/recommender/performances"

# Giả định PRODUCT_BLACKLIST và BATCH_SIZE được định nghĩa ở đâu đó hoặc mặc định là rỗng/0
# Nếu PRODUCT_BLACKLIST không tồn tại, sử dụng mảng rỗng
PRODUCT_BLACKLIST = [] if 'PRODUCT_BLACKLIST' not in locals() else PRODUCT_BLACKLIST
# Nếu BATCH_SIZE không tồn tại, sử dụng giá trị mặc định (ví dụ: 0 hoặc 32)
BATCH_SIZE = 0 if 'BATCH_SIZE' not in locals() else BATCH_SIZE

# Chuẩn bị dữ liệu để gửi
payload = {
    "precision_at_n": final_evaluation_metrics.get('precision_at_n'),
    "recall_at_n": final_evaluation_metrics.get('recall_at_n'),
    "ndcg_at_n": final_evaluation_metrics.get('ndcg_at_n'),
    "map": final_evaluation_metrics.get('map'),
    "top_n_recommendations": optimal_top_n_recommendations, # Sử dụng giá trị tối ưu
    "top_k": optimal_num_similar_items, # Sử dụng giá trị tối ưu
    "cosine_threshold": optimal_cosine_threshold, # Sử dụng giá trị tối ưu
    "hybrid_alpha": optimal_hybrid_alpha,
    "batch_size": BATCH_SIZE, # Sử dụng giá trị batch_size nếu có
    "product_blacklist": json.dumps(PRODUCT_BLACKLIST), # Chuyển đổi danh sách đen thành chuỗi JSON
    "optimal_cold_start_threshold": optimal_cold_start_threshold,
    "optimal_frequency_decay_factor": optimal_frequency_decay_factor,
    "optimal_final_hybrid_threshold": optimal_final_hybrid_threshold,
    # "optimal_min_alpha_cold_start": optimal_min_alpha_cold_start # <-- THÊM DÒNG NÀY

}

print("Dữ liệu gửi đi:", payload)

try:
    response = requests.post(API_URL, json=payload) # Gửi dữ liệu dưới dạng JSON
    response.raise_for_status() # Ném lỗi nếu status code không phải 2xx

    response_data = response.json()
    print("API Response:")
    print(json.dumps(response_data, indent=4))

    if response_data.get('status') == 'success':
        print("\n--- Dữ liệu hiệu suất đã được ghi lại thành công vào Laravel! ---")
    else:
        print("\n--- Ghi dữ liệu hiệu suất vào Laravel thất bại! ---")

except requests.exceptions.RequestException as e:
    print(f"\n--- Lỗi khi gọi API Laravel: {e} ---")
    if hasattr(e, 'response') and e.response is not None:
        print(f"Status Code: {e.response.status_code}")
        try:
            print("Response Body:", e.response.json())
        except json.JSONDecodeError:
            print("Response Body (raw):", e.response.text)

print("\n--- Kết thúc tiến trình ---")


# In[13]:


# Cell 6: Tính toán và lưu trữ Hybrid Item Similarity (Sử dụng toàn bộ dữ liệu)

print("\n--- Bắt đầu quá trình tính toán và lưu trữ Hybrid Item Similarity ---")

# 1. Tải và xử lý dữ liệu thuộc tính sản phẩm cho Content-based Filtering
# (Bước này thực tế đã được chạy trong Cell 4 và content_similarities_global đã có)
# Tuy nhiên, để đảm bảo tính độc lập hoặc nếu chạy riêng Cell 6, bạn có thể chạy lại.
# Nếu content_similarities_global đã được định nghĩa từ Cell 4, có thể bỏ qua dòng này.
# Để an toàn, chúng ta sẽ kiểm tra và tải lại nếu cần.
if 'content_similarities_global' not in locals() or not content_similarities_global:
    print("\n--- Đang tải và xử lý dữ liệu thuộc tính sản phẩm cho Content-based Filtering (nếu chưa có) ---")
    df_product_features = load_product_features()
    if df_product_features.empty:
        logger.error("Không thể tải dữ liệu thuộc tính sản phẩm. Content-based Filtering sẽ không hoạt động.")
        content_similarities_global = {} # Đặt rỗng để tránh lỗi
    else:
        content_similarities_global = compute_content_similarity(df_product_features, top_k=TOP_K)
        logger.info(f"Hoàn tất tính toán độ tương đồng Content-based cho {len(content_similarities_global)} sản phẩm.")
        if not content_similarities_global:
            logger.warning("Không có độ tương đồng Content-based được tính toán. Kiểm tra dữ liệu và TF-IDF.")


# 2. Áp dụng trọng số tối ưu cho toàn bộ dữ liệu sự kiện thô để có 'implicit_score'
print("\n--- Áp dụng trọng số tối ưu cho toàn bộ dữ liệu sự kiện ---")
# Đảm bảo df_raw_events và optimal_weights đã được định nghĩa từ các cell trước.
# optimal_weights được lấy từ Cell 4.
if 'optimal_weights' not in locals():
    logger.error("optimal_weights chưa được định nghĩa. Hãy chạy Cell 4 trước.")
    raise NameError("optimal_weights is not defined. Please run Cell 4.")


# Trong Cell 6, trước dòng gọi assign_implicit_feedback_scores:
print(f"\n--- DEBUG: Kiểm tra Event Types và Weights ---")
if 'df_raw_events' in globals(): # Kiểm tra xem biến có tồn tại không
    print("Unique event_types in df_raw_events:", df_raw_events['event_type'].unique())
else:
    logger.warning("df_raw_events không tồn tại khi kiểm tra event types.")

if 'optimal_weights' in globals(): # Kiểm tra xem biến có tồn tại không
    print("Keys in optimal_weights:", optimal_weights.keys())
else:
    logger.warning("optimal_weights không tồn tại khi kiểm tra event types.")


df_weighted_events_for_final_model = assign_implicit_feedback_scores(df_raw_events.copy(), optimal_weights)
logger.info(f"Tổng số sự kiện sau khi gán trọng số: {len(df_weighted_events_for_final_model)}")
logger.info(f"Số lượng sự kiện có implicit_score > 0: {len(df_weighted_events_for_final_model[df_weighted_events_for_final_model['implicit_score'] > 0])}")
print(f"\n--- DEBUG: Tham số đang được truyền vào assign_implicit_feedback_scores ---")
print(f"Optimal Weights: {optimal_weights}")
print(f"Optimal Frequency Decay Factor (from optimal_frequency_decay_factor): {optimal_frequency_decay_factor:.10f}") # In với độ chính xác cao
print(f"Kiểu dữ liệu của optimal_frequency_decay_factor: {type(optimal_frequency_decay_factor)}")
print(f"Kiểu dữ liệu của optimal_weights['view']: {type(optimal_weights['view'])}")

print("--- 5 hàng đầu tiên của dữ liệu sự kiện đã gán trọng số (Toàn bộ dữ liệu) ---")
print(df_weighted_events_for_final_model.head())

print("\n--- Kiểm tra giá trị implicit_score thực tế cho các hàng 'view' bị hiển thị là 0 ---")
# Lấy ra các hàng có event_type là 'view' và implicit_score hiển thị là 0
# (Lưu ý: chúng ta kiểm tra giá trị thực, không phải giá trị hiển thị)
df_views_with_low_score = df_weighted_events_for_final_model[
    (df_weighted_events_for_final_model['event_type'] == 'view') &
    (df_weighted_events_for_final_model['implicit_score'] < 0.001) # Kiểm tra các giá trị rất nhỏ
].head(10) # Lấy 10 hàng đầu tiên để kiểm tra

if not df_views_with_low_score.empty:
    with pd.option_context('display.float_format', '{:.10f}'.format): # Hiển thị nhiều chữ số thập phân hơn
        print(df_views_with_low_score[['user_id', 'product_id', 'event_type', 'implicit_score']])
else:
    print("Không tìm thấy hàng 'view' nào có implicit_score gần bằng 0.")

print(f"\nGiá trị nhỏ nhất của implicit_score trong toàn bộ DataFrame: {df_weighted_events_for_final_model['implicit_score'].min():.10f}")


# Trực quan hóa phân bố điểm implicit_score
plt.figure(figsize=(10, 6))
sns.histplot(df_weighted_events_for_final_model['implicit_score'], bins=20, kde=True)
plt.title('Phân bố điểm Implicit Score (Toàn bộ dữ liệu)')
plt.xlabel('Implicit Score')
plt.ylabel('Số lượng sự kiện')
plt.grid(True)
plt.show()


print("\n--- Tính toán số lượng tương tác của sản phẩm cho Dynamic Weighting ---")
# Sử dụng df_raw_events để lấy số lượng tương tác thô của từng sản phẩm.
# Đây là dữ liệu gốc, chưa bị loại bỏ hay biến đổi.
if 'df_raw_events' not in locals():
    logger.error("df_raw_events chưa được định nghĩa. Hãy tải dữ liệu gốc trước.")
    raise NameError("df_raw_events is not defined. Please ensure raw event data is loaded.")
item_interaction_counts_for_final_model = df_raw_events['product_id'].value_counts().to_dict()
logger.info(f"Đã tính số lượng tương tác cho {len(item_interaction_counts_for_final_model)} sản phẩm.")

# 3. Tính toán độ tương đồng Collaborative Filtering từ toàn bộ dữ liệu
print("\n--- Bắt đầu tính toán độ tương đồng Collaborative Filtering (CF) từ toàn bộ dữ liệu ---")
collab_similarities_final = compute_sparse_similarity(df_weighted_events_for_final_model, TOP_K, COSINE_THRESHOLD)
logger.info(f"Đã tính toán độ tương đồng CF cho {len(collab_similarities_final)} sản phẩm.")

# 4. Kết hợp độ tương đồng CF và Content-based sử dụng alpha lai tối ưu
print("\n--- Bắt đầu kết hợp độ tương đồng CF và Content-based (Hybrid) ---")
# Đảm bảo optimal_hybrid_alpha đã được định nghĩa từ Cell 4.
if 'optimal_hybrid_alpha' not in locals():
    logger.error("optimal_hybrid_alpha chưa được định nghĩa. Hãy chạy Cell 4 trước.")
    raise NameError("optimal_hybrid_alpha is not defined. Please run Cell 4.")


final_hybrid_similarities = combine_similarities(
    collab_similarities_final,
    content_similarities_global,
    optimal_hybrid_alpha, # Sử dụng alpha lai tối ưu
    item_interaction_counts_for_final_model, # TRUYỀN THAM SỐ MỚI ĐÃ TÍNH
    int(optimal_cold_start_threshold),
    top_k=optimal_num_similar_items,
    min_alpha_cold_start=optimal_min_alpha_cold_start # <--- THÊM DÒNG NÀY
)


# print("\n--- Bắt đầu kết hợp độ tương đồng CF và Content-based (Hybrid) ---")
# # Đảm bảo optimal_hybrid_alpha đã được định nghĩa từ Cell 4.
# if 'HYBRID_ALPHA' not in locals():
#     logger.error("optimal_hybrid_alpha chưa được định nghĩa. Hãy chạy Cell 4 trước.")
#     raise NameError("optimal_hybrid_alpha is not defined. Please run Cell 4.")

# final_hybrid_similarities = combine_similarities(
#     collab_similarities_final,
#     content_similarities_global,
#     HYBRID_ALPHA, # Sử dụng alpha lai tối ưu
#     top_k=TOP_K
# )
logger.info(f"Đã tính toán độ tương đồng Hybrid cho {len(final_hybrid_similarities)} sản phẩm.")


# <--- BẮT ĐẦU THÊM LOGIC LỌC FINAL_HYBRID_THRESHOLD Ở ĐÂY ---
if optimal_final_hybrid_threshold > 0: # Chỉ lọc nếu ngưỡng > 0
    print(f"\n--- Đang lọc Hybrid Item Similarity bằng FINAL_HYBRID_THRESHOLD ({optimal_final_hybrid_threshold:.4f}) ---")
    filtered_final_hybrid_similarities = {}
    items_before_filter = len(final_hybrid_similarities)
    total_pairs_before_filter = sum(len(v) for v in final_hybrid_similarities.values())
    
    count_items_with_neighbors_after_filter = 0
    total_pairs_after_filter = 0

    for p1, neighbours in final_hybrid_similarities.items():
        filtered_neighbours_for_p1 = []
        for p2, hybrid_score, cf_score, content_score in neighbours:
            if hybrid_score >= optimal_final_hybrid_threshold:
                filtered_neighbours_for_p1.append((p2, hybrid_score, cf_score, content_score))
        
        if filtered_neighbours_for_p1:
            filtered_final_hybrid_similarities[p1] = filtered_neighbours_for_p1
            count_items_with_neighbors_after_filter += 1
            total_pairs_after_filter += len(filtered_neighbours_for_p1)
        # else: # Có thể giữ lại entry rỗng để biết sản phẩm đó vẫn được tính nhưng không có láng giềng phù hợp
        #     filtered_final_hybrid_similarities[p1] = [] 

    final_hybrid_similarities = filtered_final_hybrid_similarities # Cập nhật biến để sử dụng kết quả đã lọc
    logger.info(f"Số lượng sản phẩm có độ tương đồng Hybrid (sau khi lọc FINAL_HYBRID_THRESHOLD): {len(final_hybrid_similarities)}")
    logger.info(f"Tổng số cặp tương đồng trước lọc: {total_pairs_before_filter}, sau lọc: {total_pairs_after_filter}")
    logger.info(f"Số sản phẩm có láng giềng (trước lọc): {items_before_filter}, (sau lọc): {count_items_with_neighbors_after_filter}")

# --- KẾT THÚC LOGIC LỌC FINAL_HYBRID_THRESHOLD ---

# Kiểm tra nếu final_hybrid_similarities rỗng
if not final_hybrid_similarities:
    logger.warning("Ma trận độ tương đồng lai cuối cùng rỗng sau khi lọc. Không có dữ liệu để lưu trữ.")
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
        # SỬA LỖI Ở ĐÂY: bóc tách đủ 4 giá trị và sử dụng hybrid_score
        for _, hybrid_score, cf_score, content_score in sim_list:
            all_hybrid_scores.append(hybrid_score) # Dùng hybrid_score để trực quan hóa

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


    # 5. Lưu trữ độ tương đồng lai vào cơ sở dữ liệu - SỬA ĐỔI QUAN TRỌNG
    def persist_similarity(topk: Dict[int, List[Tuple[int, float, float, float]]]):
        session = SessionLocal()
        try:
            session.execute(text(f"TRUNCATE TABLE {ItemSimilarity.__tablename__}"))
            session.commit()
            logger.info(f"Cleared existing data from {ItemSimilarity.__tablename__}.")
            batch = []
            row_count = 0
            # THÊM MỘT SET ĐỂ LƯU TRỮ CÁC CẶP ĐÃ ĐƯỢC THÊM
            processed_pairs = set()

            for p1, neighbours in topk.items():
                for p2, hybrid_score, cf_score, content_score in neighbours:
                    # Đảm bảo p1 luôn nhỏ hơn hoặc bằng p2 để tạo cặp duy nhất
                    # Sử dụng min/max để chuẩn hóa cặp
                    prod_id_1_normalized = min(int(p1), int(p2))
                    prod_id_2_normalized = max(int(p1), int(p2))

                    # Bỏ qua các cặp mà hai sản phẩm là như nhau (độ tương đồng của một item với chính nó)
                    if prod_id_1_normalized == prod_id_2_normalized:
                        continue

                    # Tạo một tuple đại diện cho cặp đã chuẩn hóa
                    current_pair = (prod_id_1_normalized, prod_id_2_normalized)

                    # Chỉ thêm vào batch nếu cặp này chưa được xử lý
                    if current_pair not in processed_pairs:
                        batch.append({
                            'product_id_1': prod_id_1_normalized,
                            'product_id_2': prod_id_2_normalized,
                            'score': float(hybrid_score),
                            'cf_score': float(cf_score),
                            'content_score': float(content_score)
                        })
                        processed_pairs.add(current_pair) # Thêm cặp đã xử lý vào set
                        row_count += 1

                    if len(batch) >= BATCH_SIZE:
                        try:
                            session.bulk_insert_mappings(ItemSimilarity, batch)
                            session.commit()
                            logger.debug(f"Inserted {len(batch)} rows into {ItemSimilarity.__tablename__}.")
                        except Exception as insert_e:
                            session.rollback()
                            logger.error(f"Lỗi khi bulk_insert_mappings: {insert_e}")
                            raise # Re-raise để dừng quá trình nếu lỗi nghiêm trọng
                        finally:
                            batch.clear()

            if batch: # Insert any remaining rows
                try:
                    session.bulk_insert_mappings(ItemSimilarity, batch)
                    session.commit()
                    logger.debug(f"Inserted {len(batch)} remaining rows into {ItemSimilarity.__tablename__}.")
                except Exception as insert_e:
                    session.rollback()
                    logger.error(f"Lỗi khi bulk_insert_mappings phần còn lại: {insert_e}")
                    raise # Re-raise để dừng quá trình nếu lỗi nghiêm trọng

            logger.info(f"Persisted {row_count} unique item similarities successfully into {ItemSimilarity.__tablename__}.")
        except Exception as e:
            session.rollback()
            logger.exception("Failed to persist item similarity: %s", e)
        finally:
            session.close()

    print("\n--- Bắt đầu lưu trữ độ tương đồng Hybrid Item Similarity vào cơ sở dữ liệu ---")
    # Đảm bảo `final_hybrid_similarities` đã được tính toán ở bước 4 của cell này
    persist_similarity(final_hybrid_similarities)
    print("--- Hoàn tất lưu trữ Hybrid Item Similarity ---")

# Cấu hình URL của Laravel API
# Đảm bảo URL này khớp với nơi ứng dụng Laravel của bạn đang chạy
# Ví dụ: nếu bạn đang chạy 'php artisan serve' ở cổng mặc định, nó sẽ là:
LARAVEL_API_BASE_URL = "http://localhost:8000/api"
# Nếu bạn đã nhóm route dưới một tiền tố khác hoặc không có tiền tố, hãy điều chỉnh
# Ví dụ: nếu không có tiền tố: LARAVEL_API_BASE_URL = "http://localhost:8000/api"

try:
    # Chuyển DataFrame sang định dạng List of Dicts Python
    # df.to_dict(orient='records') là cách tiêu chuẩn của Pandas
    # Lưu ý: Các giá trị numpy float cần được chuyển thành float chuẩn của Python để JSON hóa đúng cách
    data_to_send = df_weighted_events_for_final_model[['user_id', 'product_id', 'implicit_score']].to_dict(orient='records')
    
    # Chuyển đổi các giá trị numpy sang kiểu Python chuẩn để đảm bảo JSON serialization
    for record in data_to_send:
        for key, value in record.items():
            if isinstance(value, (np.integer, np.floating)):
                record[key] = value.item() # Chuyển đổi numpy type sang Python native type

    payload = {
        "events": data_to_send
    }

    # API endpoint để lưu trữ dữ liệu
    api_endpoint = f"{LARAVEL_API_BASE_URL}/weighted-events"

    # Gửi dữ liệu theo từng batch qua API
    # Bạn có thể điều chỉnh BATCH_SIZE này cho việc gửi API, nó khác với chunksize của .to_sql()
    API_BATCH_SIZE = 2000 # Ví dụ: gửi 2000 bản ghi mỗi lần qua API
    
    total_records_sent = 0
    for i in range(0, len(data_to_send), API_BATCH_SIZE):
        batch = data_to_send[i : i + API_BATCH_SIZE]
        payload['events'] = batch # Cập nhật payload với batch hiện tại

        print(f"Đang gửi batch {i // API_BATCH_SIZE + 1} ({len(batch)} bản ghi)...")
        response = requests.post(
            api_endpoint,
            json=payload, # Gửi dữ liệu dưới dạng JSON
            headers={'Content-Type': 'application/json'}
            # Có thể thêm timeout nếu cần: timeout=300
        )
        response.raise_for_status() # Nâng ngoại lệ cho lỗi HTTP (4xx hoặc 5xx)
        
        response_json = response.json()
        total_records_sent += response_json.get('count', len(batch)) # Lấy count từ response nếu có, không thì dùng len(batch)
        logger.info(f"Batch {i // API_BATCH_SIZE + 1} đã được lưu thành công. Message: {response_json.get('message')}")

    logger.info(f"Tổng cộng đã gửi và lưu {total_records_sent} bản ghi df_weighted_events_for_final_model qua Laravel API.")

    # RẤT QUAN TRỌNG: Xóa DataFrame khỏi bộ nhớ sau khi gửi
    del df_weighted_events_for_final_model
    gc.collect()
    logger.info("Đã giải phóng df_weighted_events_for_final_model khỏi bộ nhớ.")

except requests.exceptions.RequestException as e:
    logger.error(f"Lỗi khi gửi df_weighted_events_for_final_model đến Laravel API: {e}")
    if hasattr(e, 'response') and e.response is not None:
        logger.error(f"Phản hồi từ API: {e.response.text}")
    raise # Dừng lại nếu không thể lưu dữ liệu quan trọng
except Exception as e:
    logger.error(f"Lỗi không xác định khi xử lý df_weighted_events_for_final_model: {e}")
    raise
print("\n--- Hoàn tất quá trình tính toán và lưu trữ Hybrid Item Similarity ---")




# In[14]:


import pandas as pd
from typing import Dict, List, Tuple, Set
from collections import defaultdict
from sqlalchemy import create_engine, text, Column, Integer, Float
from sqlalchemy.ext.declarative import declarative_base
import logging
import json
import os
import glob
import numpy as np
import gc
import sys # Import sys to check object size
from sqlalchemy.orm import sessionmaker # Import sessionmaker for SessionLocal

# --- Cấu hình Logger ---
logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO) # Đặt mức độ log

# --- CONFIGURATION (MySQL DB) ---
# Các biến môi trường cho DB
DB_USER = os.getenv('DB_USER', 'root')
DB_PASS = os.getenv('DB_PASS', '') # THAY THẾ BẰNG PASSWORD CỦA BẠN NẾU CÓ
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'thesis')

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASS}@{DB_HOST}:3306/{DB_NAME}"

# --- Khởi tạo SQLAlchemy Engine và Định nghĩa các Bảng ---
try:
    engine = create_engine(DATABASE_URL)
    Base = declarative_base()

    # Định nghĩa cấu trúc bảng user_recommendations
    class UserRecommendation(Base):
        __tablename__ = 'user_recommendations'
        user_id = Column(Integer, primary_key=True)
        product_id = Column(Integer, primary_key=True)
        score = Column(Float)

    # *** ĐỊNH NGHĨA BẢNG item_similarity CỦA BẠN TẠI ĐÂY ***
    class ItemSimilarity(Base):
        __tablename__ = 'item_similarity'
        product_id_1 = Column(Integer, primary_key=True)
        product_id_2 = Column(Integer, primary_key=True)
        score = Column(Float) # Hybrid score
        cf_score = Column(Float) # Collaborative Filtering score
        content_score = Column(Float) # Content-Based score

    # *** ĐỊNH NGHĨA BẢNG weighted_events_processed CỦA BẠN TẠI ĐÂY ***
    # Nếu bảng này đã được tạo bởi một script khác, bạn vẫn cần định nghĩa nó
    # ở đây để SQLAlchemy có thể ánh xạ (map) các truy vấn tới nó.
    # Đảm bảo các cột và kiểu dữ liệu khớp với bảng thực tế trong DB.
    class WeightedEvent(Base):
        __tablename__ = 'weighted_events_processed'
        # Giả định một khóa chính nếu chưa có. user_id và product_id có thể không phải PK duy nhất
        id = Column(Integer, primary_key=True, autoincrement=True) # Hoặc sử dụng cặp (user_id, product_id) làm PK nếu đó là cách bạn thiết kế
        user_id = Column(Integer)
        product_id = Column(Integer)
        implicit_score = Column(Float)
        # Thêm các cột khác nếu có trong bảng weighted_events_processed của bạn

    # *** ĐỊNH NGHĨA BẢNG products CỦA BẠN TẠI ĐÂY ***
    class Product(Base):
        __tablename__ = 'products'
        product_id = Column(Integer, primary_key=True)
        # Thêm các cột khác của bảng products nếu cần, ví dụ: name, category, ...

    # Tạo tất cả các bảng đã định nghĩa (nếu chúng chưa tồn tại)
    Base.metadata.create_all(engine)
    logger.info("SQLAlchemy engine đã được tạo và các bảng cần thiết đã được đảm bảo trong MySQL.")

    # Tạo SessionLocal sau khi engine đã được định nghĩa
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

except Exception as e:
    logger.critical(f"Không thể tạo SQLAlchemy engine hoặc đảm bảo các bảng DB trong MySQL. Lỗi: {e}")
    raise

# --- Tải các tham số tối ưu (giữ nguyên) ---
optimal_params = {}
results_dir = 'optimization_results'
list_of_files = glob.glob(os.path.join(results_dir, 'optimal_hybrid_weights_*.json'))
if list_of_files:
    latest_file = max(list_of_files, key=os.path.getctime)
    with open(latest_file, 'r') as f:
        optimal_params = json.load(f)
    logger.info(f"Đã tải các tham số tối ưu từ file: {latest_file}")
else:
    logger.warning("Không tìm thấy file kết quả tối ưu. Sử dụng giá trị mặc định cho các tham số.")
    optimal_params = {
        'optimal_top_n_recommendations': 10,
        'optimal_cold_start_threshold': 9,
        'optimal_min_alpha_cold_start': 0.1119,
        'optimal_final_hybrid_threshold': 0.2840
    }

optimal_top_n_recommendations = optimal_params.get('optimal_top_n_recommendations', 10)
cold_start_threshold = optimal_params.get('optimal_cold_start_threshold', 9)
min_alpha_cold_start = optimal_params.get('optimal_min_alpha_cold_start', 0.1119)
final_hybrid_threshold = optimal_params.get('optimal_final_hybrid_threshold', 0.2840)

logger.info(f"Sử dụng TOP_N_RECOMMENDATIONS: {optimal_top_n_recommendations}")
logger.info(f"Sử dụng Cold-Start Threshold: {cold_start_threshold}")
logger.info(f"Sử dụng Final Hybrid Threshold (áp dụng cho từng loại score): {final_hybrid_threshold}")

# --- Các hàm mmr_diversity và prepare_content_sim_for_lookup (giữ nguyên) ---
def mmr_diversity(candidate_items_with_scores: List[Tuple[int, float]],
                  content_sim_lookup: Dict[int, Dict[int, float]],
                  lambda_diversity: float,
                  top_n: int) -> List[Tuple[int, float]]:
    if not candidate_items_with_scores:
        return []

    sorted_candidates = sorted(candidate_items_with_scores, key=lambda x: x[1], reverse=True)
    selected_items = []
    selected_item_ids = set()

    if top_n <= 0:
        return []

    if sorted_candidates:
        first_item_id, first_item_score = sorted_candidates[0]
        selected_items.append((first_item_id, first_item_score))
        selected_item_ids.add(first_item_id)

    for _ in range(top_n - 1):
        best_item = None
        max_mmr_score = -1.0

        remaining_candidates = [item for item in sorted_candidates if item[0] not in selected_item_ids]
        if not remaining_candidates:
            break

        for candidate_id, candidate_score in remaining_candidates:
            max_similarity_with_selected = 0.0
            if selected_item_ids:
                for selected_id in selected_item_ids:
                    sim = content_sim_lookup.get(candidate_id, {}).get(selected_id, 0.0)
                    max_similarity_with_selected = max(max_similarity_with_selected, sim)

            mmr_score = lambda_diversity * candidate_score - (1 - lambda_diversity) * max_similarity_with_selected

            if mmr_score > max_mmr_score:
                max_mmr_score = mmr_score
                best_item = (candidate_id, candidate_score)

        if best_item:
            selected_items.append(best_item)
            selected_item_ids.add(best_item[0])
        else:
            break
    return selected_items


def prepare_content_sim_for_lookup(content_sims_for_preparation: Dict[int, List[Tuple[int, float]]]) -> Dict[int, Dict[int, float]]:
    logger.info("Bắt đầu chuẩn bị content_sim_lookup...")
    lookup = {}
    total_entries = 0
    for pid, similarities in content_sims_for_preparation.items():
        lookup[pid] = {target_pid: score for target_pid, score in similarities}
        total_entries += len(similarities)
    logger.info(f"Hoàn thành chuẩn bị content_sim_lookup với {len(lookup)} mục gốc và {total_entries} tổng số mục tương đồng.")
    return lookup


# --- Hàm generate_hybrid_recommendations_with_hard_thresholding (giữ nguyên) ---
def generate_hybrid_recommendations_with_hard_thresholding(
    user_id: int,
    user_implicit_scores: List[Tuple[int, float]],
    user_interacted_products: Set[int],
    all_product_ids: Set[int],
    hybrid_item_similarities: Dict[int, List[Tuple[int, float, float, float]]],
    content_sim_lookup: Dict[int, Dict[int, float]],
    top_n: int = 10,
    prediction_threshold: float = 0.5,
    lambda_diversity: float = 0.5
) -> List[Tuple[int, float]]:
    logger.debug(f"Đang tạo đề xuất lai cho người dùng {user_id} với ngưỡng cứng và MMR...")
    logger.debug(f"Người dùng {user_id} đã tương tác với {len(user_interacted_products)} sản phẩm.")
    predicted_scores: Dict[int, float] = defaultdict(float)

    if not user_implicit_scores:
        logger.warning(f"Không có dữ liệu tương tác ngầm định cho người dùng {user_id}. Đang đề xuất các sản phẩm phổ biến/ngẫu nhiên đa dạng.")
        all_candidate_products = [(pid, 0.5) for pid in all_product_ids if pid not in user_interacted_products]
        if not all_candidate_products:
            logger.warning("Không có sản phẩm nào khả dụng để đề xuất cho người dùng mới.")
            return []
        np.random.shuffle(all_candidate_products)
        initial_mmr_pool_size = max(top_n * 5, 50)
        candidate_recommendations_for_mmr = sorted(all_candidate_products, key=lambda x: x[1], reverse=True)[:initial_mmr_pool_size]
        diverse_recommendations = mmr_diversity(
            candidate_items_with_scores=candidate_recommendations_for_mmr,
            content_sim_lookup=content_sim_lookup,
            lambda_diversity=lambda_diversity,
            top_n=top_n
        )
        return diverse_recommendations

    for source_product_id, source_implicit_score in user_implicit_scores:
        similar_items = hybrid_item_similarities.get(source_product_id, [])
        for target_product_id, hybrid_sim_score, _, _ in similar_items:
            if target_product_id in user_interacted_products:
                continue
            predicted_scores[target_product_id] += source_implicit_score * hybrid_sim_score

    candidate_recommendations_raw = sorted(
        [(pid, score) for pid, score in predicted_scores.items() if score >= prediction_threshold and pid not in user_interacted_products],
        key=lambda x: x[1],
        reverse=True
    )
    
    if not candidate_recommendations_raw:
        logger.warning(f"Không có sản phẩm nào đạt ngưỡng {prediction_threshold} cho người dùng {user_id} sau tính toán ban đầu. Trả về danh sách rỗng.")
        return []
    logger.debug(f"Tìm thấy {len(candidate_recommendations_raw)} ứng viên ban đầu cho người dùng {user_id} trước khi áp dụng MMR.")
    diverse_recommendations = mmr_diversity(
        candidate_items_with_scores=candidate_recommendations_raw,
        content_sim_lookup=content_sim_lookup,
        lambda_diversity=lambda_diversity,
        top_n=top_n
    )
    logger.debug(f"Đã tạo {len(diverse_recommendations)} đề xuất đa dạng cho người dùng {user_id} sử dụng MMR.")
    return diverse_recommendations
    
# 7. Lưu trữ đề xuất người dùng vào cơ sở dữ liệu (Cập nhật để nhận 'engine')
def save_recommendations(user_recs_to_save: Dict[int, List[Tuple[int, float]]], engine):
    if not user_recs_to_save:
        logger.warning("Không có đề xuất nào để lưu trữ.")
        return
    try:
        total_recs_saved = 0
        with engine.begin() as conn:
            for user_id, recs in user_recs_to_save.items():
                conn.execute(text("DELETE FROM user_recommendations WHERE user_id = :uid"), {'uid': user_id})
                if recs:
                    insert_values = [{'user_id': user_id, 'product_id': pid, 'score': float(score)} for pid, score in recs]
                    conn.execute(
                        text("INSERT INTO user_recommendations (user_id, product_id, score) VALUES (:user_id, :product_id, :score)"),
                        insert_values
                    )
                    total_recs_saved += len(recs)
        logger.debug(f"Đã lưu {total_recs_saved} đề xuất trong batch này.")
    except Exception as e:
        logger.exception("Lỗi khi lưu đề xuất người dùng: %s", e)


print("\n--- Bắt đầu tạo đề xuất lai (Hybrid Recommendations) cho người dùng ---")

# --- ĐỌC DỮ LIỆU ĐỘ TƯƠNG ĐỒNG TỪ DB (Chỉ chạy một lần duy nhất) ---
# Đây là những đối tượng có khả năng lớn
hybrid_item_similarities: Dict[int, List[Tuple[int, float, float, float]]] = defaultdict(list)
content_sims_for_preparation: Dict[int, List[Tuple[int, float]]] = defaultdict(list)

try:
    with engine.connect() as conn:
        # Đảm bảo bảng item_similarity tồn tại và có dữ liệu trong MySQL thesis DB
        sim_rows = conn.execute(text("SELECT product_id_1, product_id_2, score, cf_score, content_score FROM item_similarity")).fetchall()
        logger.info(f"Đã đọc {len(sim_rows)} cặp độ tương đồng lai từ cơ sở dữ liệu.")

        for p1, p2, hybrid_s, cf_s, cb_s in sim_rows:
            hybrid_item_similarities[p1].append((p2, float(hybrid_s), float(cf_s), float(cb_s)))
            hybrid_item_similarities[p2].append((p1, float(hybrid_s), float(cf_s), float(cb_s))) # Thêm đối xứng
            
            content_sims_for_preparation[p1].append((p2, float(cb_s)))
            content_sims_for_preparation[p2].append((p1, float(cb_s))) # Thêm đối xứng cho content sim

except Exception as e:
    logger.error(f"Lỗi khi đọc dữ liệu độ tương đồng từ DB: {e}")
    raise

logger.info(f"Kích thước hiện tại của hybrid_item_similarities: {sys.getsizeof(hybrid_item_similarities)} bytes")
logger.info(f"Kích thước hiện tại của content_sims_for_preparation: {sys.getsizeof(content_sims_for_preparation)} bytes")


# Chuẩn bị content_sim_lookup (Chỉ chạy một lần duy nhất)
if content_sims_for_preparation:
    content_sim_lookup = prepare_content_sim_for_lookup(content_sims_for_preparation)
    logger.info(f"Đã tạo content_sim_lookup với {len(content_sim_lookup)} mục gốc.")
    del content_sims_for_preparation # Giải phóng bộ nhớ vì nó đã được chuyển đổi thành lookup
    gc.collect()
    logger.info(f"Kích thước hiện tại của content_sim_lookup: {sys.getsizeof(content_sim_lookup)} bytes sau khi xóa content_sims_for_preparation.")
else:
    logger.warning("Không có dữ liệu để tạo content_sim_lookup. MMR có thể không hoạt động hiệu quả.")
    content_sim_lookup = {}

# --- Tải product_df và tạo set các product_id (Chỉ chạy một lần duy nhất) ---
try:
    with engine.connect() as conn:
        # Ưu tiên lấy từ bảng đã xử lý implicit score (từ MySQL)
        all_product_ids_query = text("SELECT DISTINCT product_id FROM weighted_events_processed")
        product_ids_from_db = conn.execute(all_product_ids_query).fetchall()
        product_df = pd.DataFrame({'product_id': [row[0] for row in product_ids_from_db]})
    logger.info(f"Đã tải product_df từ 'weighted_events_processed' với {len(product_df)} sản phẩm.")
except Exception as e_initial_load:
    logger.warning(f"Không thể tải product_ids từ 'weighted_events_processed': {e_initial_load}. Thử tải từ bảng 'products'.")
    try:
        with engine.connect() as conn:
            product_df = pd.read_sql_table('products', conn) # Thử tải từ bảng 'products' (từ MySQL)
        logger.info(f"Đã tải {len(product_df)} sản phẩm từ bảng 'products'.")
    except Exception as e_fallback:
        logger.critical(f"Không thể tải product_df từ bất kỳ nguồn nào. Lỗi: {e_fallback}")
        raise # Dừng lại nếu không thể có danh sách sản phẩm

all_product_ids_set = set(product_df['product_id'].unique())
logger.info(f"Đã tải {len(all_product_ids_set)} ID sản phẩm duy nhất.")
del product_df # Giải phóng bộ nhớ của product_df
gc.collect()


# --- XỬ LÝ DỮ LIỆU NGƯỜI DÙNG THEO BATCH TRỰC TIẾP TỪ DB (MySQL) ---

# Lấy tất cả user_id duy nhất từ bảng weighted_events_processed
try:
    with engine.connect() as conn:
        all_users_from_db = conn.execute(text("SELECT DISTINCT user_id FROM weighted_events_processed")).fetchall()
        all_users = [row[0] for row in all_users_from_db]
    logger.info(f"Đã tải {len(all_users)} user_id duy nhất từ cơ sở dữ liệu (weighted_events_processed).")
except Exception as e:
    logger.error(f"Lỗi khi tải danh sách user_id từ DB: {e}")
    raise # Dừng lại nếu không thể có danh sách người dùng

logger.info(f"Tổng số người dùng cần tạo đề xuất: {len(all_users)}")

# Kích thước mỗi batch. Đã giảm BATCH_SIZE
BATCH_SIZE = 50 # Bạn có thể giảm thêm: 20, 10, hoặc 5 nếu vẫn bị OOM

user_recs_for_batch: Dict[int, List[Tuple[int, float]]] = {}

total_users_processed = 0
for i in range(0, len(all_users), BATCH_SIZE):
    current_users_batch = all_users[i : i + BATCH_SIZE]
    logger.info(f"Đang xử lý batch người dùng {i // BATCH_SIZE + 1} ({len(current_users_batch)} người dùng).")

    # TRUY VẤN DB ĐỂ LẤY DỮ LIỆU CHO BATCH HIỆN TẠI TỪ BẢNG 'weighted_events_processed'
    try:
        user_ids_str = ','.join([str(uid) for uid in current_users_batch])
        query = text(f"SELECT user_id, product_id, implicit_score FROM weighted_events_processed WHERE user_id IN ({user_ids_str})")
        
        with engine.connect() as conn:
            batch_rows = conn.execute(query).fetchall()
        
        current_batch_implicit_feedback_dict: Dict[int, List[Tuple[int, float]]] = defaultdict(list)
        current_batch_interacted_products_dict: Dict[int, Set[int]] = defaultdict(set)

        for row in batch_rows:
            uid, pid, score = int(row[0]), int(row[1]), float(row[2])
            current_batch_implicit_feedback_dict[uid].append((pid, score))
            current_batch_interacted_products_dict[uid].add(pid)
        
        # Rất quan trọng: Xóa batch_rows ngay sau khi chuyển đổi để giải phóng bộ nhớ
        del batch_rows
        gc.collect()

        logger.info(f"Đã tải và tiền xử lý data từ DB cho {len(current_users_batch)} người dùng trong batch này.")

    except Exception as e:
        logger.error(f"Lỗi khi tải dữ liệu tương tác cho batch người dùng từ DB: {e}")
        continue # Bỏ qua batch lỗi và tiếp tục

    # Lặp qua từng người dùng trong batch để tạo đề xuất
    for u_id in current_users_batch:
        current_user_implicit_scores = current_batch_implicit_feedback_dict.get(u_id, [])
        current_user_interacted_products = current_batch_interacted_products_dict.get(u_id, set())

        recommendations_for_user = generate_hybrid_recommendations_with_hard_thresholding(
            user_id=u_id,
            user_implicit_scores=current_user_implicit_scores,
            user_interacted_products=current_user_interacted_products,
            all_product_ids=all_product_ids_set,
            hybrid_item_similarities=hybrid_item_similarities,
            content_sim_lookup=content_sim_lookup,
            top_n=optimal_top_n_recommendations,
            prediction_threshold=final_hybrid_threshold,
            lambda_diversity=0.5
        )
        if recommendations_for_user:
            user_recs_for_batch[u_id] = recommendations_for_user
    
    # Sau khi xử lý xong một batch, LƯU VÀO DB VÀ XÓA KHỎI BỘ NHỚ
    if user_recs_for_batch:
        save_recommendations(user_recs_for_batch, engine)
        total_users_processed += len(user_recs_for_batch)
        user_recs_for_batch.clear()
        
        del current_batch_implicit_feedback_dict
        del current_batch_interacted_products_dict
        gc.collect()
        logger.info(f"Đã lưu và xóa đề xuất cho {len(current_users_batch)} người dùng trong batch này. Tổng cộng {total_users_processed} người dùng đã được xử lý.")

print(f"Đã tạo và lưu đề xuất lai cho {total_users_processed} người dùng với TOP_N={optimal_top_n_recommendations}.")

print("\n--- Toàn bộ quy trình đề xuất lai đã hoàn thành thành công! ---")


# In[18]:





# In[ ]:




